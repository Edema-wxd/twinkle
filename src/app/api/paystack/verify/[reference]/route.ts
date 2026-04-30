import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { orders, orderItems } from '@/db'
import { eq } from 'drizzle-orm'

type PaystackVerifyResponse = {
  status: boolean
  message?: string
  data?: {
    reference: string
    status: string // 'success' | ...
    amount: number // kobo
    currency: string
    customer: { email: string }
    ip_address?: string | null
    metadata?: unknown
  }
}

type PaystackMetadata = {
  cart_items: Array<{
    productId: string
    productName: string
    variantId: string
    variantName: string
    tierQty: number
    threadColour: string
    unitPrice: number
    quantity: number
    isTool: boolean
  }>
  customer_details: {
    first_name: string
    last_name: string
    phone: string
    delivery_address: string
    state: string
  }
  subtotal: number
  shipping_cost: number
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  const { reference } = await params

  if (!process.env.PAYSTACK_SECRET_KEY) {
    return NextResponse.json(
      { error: 'PAYSTACK_SECRET_KEY is not configured' },
      { status: 500 }
    )
  }

  // Verify transaction with Paystack (server-side) so local/dev works even when
  // webhooks can't reach localhost, and to reduce "paid but dashboard not updated" races.
  let payload: PaystackVerifyResponse
  try {
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
        cache: 'no-store',
      }
    )

    payload = (await res.json()) as PaystackVerifyResponse
    if (!res.ok) {
      return NextResponse.json(
        { error: payload?.message ?? 'Paystack verify failed' },
        { status: 502 }
      )
    }
  } catch (e) {
    return NextResponse.json(
      { error: 'Failed to reach Paystack verify API', detail: String(e) },
      { status: 502 }
    )
  }

  if (!payload?.status || !payload.data) {
    return NextResponse.json(
      { error: payload?.message ?? 'Invalid Paystack verify response' },
      { status: 502 }
    )
  }

  if (payload.data.reference !== reference) {
    return NextResponse.json(
      { error: 'Reference mismatch in Paystack verify response' },
      { status: 400 }
    )
  }

  if (payload.data.status !== 'success') {
    return NextResponse.json(
      { ok: false, reference, status: payload.data.status },
      { status: 409 }
    )
  }

  const metadata = payload.data.metadata as PaystackMetadata | undefined
  const { customer_details, cart_items, subtotal, shipping_cost } = metadata ?? ({} as Partial<PaystackMetadata>)

  if (!customer_details || !Array.isArray(cart_items) || cart_items.length === 0) {
    return NextResponse.json(
      { error: 'Missing required metadata to build order', reference },
      { status: 400 }
    )
  }

  if (typeof subtotal !== 'number' || typeof shipping_cost !== 'number') {
    return NextResponse.json(
      { error: 'Missing subtotal/shipping_cost in metadata', reference },
      { status: 400 }
    )
  }

  // Upsert-ish behavior: if order exists, mark it paid and store payload;
  // if it doesn't exist yet (webhook not delivered), create it now.
  const [existing] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.paystackReference, reference))
    .limit(1)

  let orderId: string

  if (existing) {
    orderId = existing.id
    await db
      .update(orders)
      .set({ status: 'paid', paystackPayload: payload.data as unknown })
      .where(eq(orders.id, orderId))
  } else {
    const [order] = await db
      .insert(orders)
      .values({
        paystackReference: reference,
        paystackPayload: payload.data as unknown,
        status: 'paid',
        customerName: `${customer_details.first_name} ${customer_details.last_name}`.trim(),
        customerEmail: payload.data.customer.email.toLowerCase(),
        customerPhone: customer_details.phone,
        customerIp: payload.data.ip_address ?? null,
        deliveryAddress: customer_details.delivery_address,
        deliveryState: customer_details.state,
        shippingCost: shipping_cost,
        subtotal,
        total: subtotal + shipping_cost,
      })
      .returning({ id: orders.id })

    if (!order) {
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    orderId = order.id

    const items = cart_items.map((item) => ({
      orderId,
      productId: item.productId,
      productName: item.productName,
      variantId: item.variantId,
      variantName: item.variantName,
      tierQty: item.tierQty,
      threadColour: item.isTool ? null : item.threadColour,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.unitPrice * item.quantity,
    }))

    await db.insert(orderItems).values(items)
  }

  return NextResponse.json({ ok: true, reference, orderId })
}

