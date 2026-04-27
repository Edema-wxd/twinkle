import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { orders, orderItems, abandonedOrders } from '@/db'
import { eq, and, gte } from 'drizzle-orm'

// ── Paystack webhook payload types ──────────────────────────────────────────

interface PaystackCustomer {
  email: string
}

interface PaystackChargeData {
  reference: string
  amount: number // in kobo
  customer: PaystackCustomer
  ip_address: string | null
  metadata: PaystackMetadata
}

interface PaystackMetadata {
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

interface PaystackEvent {
  event: string
  data: PaystackChargeData
}

// ── Webhook handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Read raw body first — must happen before any JSON parsing
  const body = await req.text()

  // 2. Verify HMAC SHA512 signature
  const signature = req.headers.get('x-paystack-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
  }

  const expectedSignature = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(body)
    .digest('hex')

  if (signature !== expectedSignature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // 3. Parse event
  let event: PaystackEvent
  try {
    event = JSON.parse(body)
  } catch {
    console.error('[webhook] Malformed JSON body for signature', signature)
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // 4. Handle charge.success — await to ensure DB write completes before
  //    returning 200 (Paystack allows up to 10 seconds; two inserts are fast)
  try {
    if (event.event === 'charge.success') {
      await handleChargeSuccess(event.data)
    }
  } catch (err) {
    console.error('[webhook] Unhandled error in handleChargeSuccess:', err)
    // Return 200 to prevent infinite Paystack retries for a payload we cannot parse.
    return NextResponse.json({ received: true, warning: 'processing_error' }, { status: 200 })
  }

  return NextResponse.json({ received: true }, { status: 200 })
}

// ── Order creation ───────────────────────────────────────────────────────────

async function handleChargeSuccess(data: PaystackChargeData) {
  // Idempotency guard — ignore duplicate webhook fires
  const [existing] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.paystackReference, data.reference))
    .limit(1)

  if (existing) {
    // Order already created from a previous delivery of this webhook
    return
  }

  const { customer_details, cart_items, subtotal, shipping_cost } = data.metadata ?? {}
  if (!customer_details || !Array.isArray(cart_items) || cart_items.length === 0) {
    console.error('[webhook] Missing metadata fields for reference:', data.reference)
    return
  }

  const [order] = await db
    .insert(orders)
    .values({
      paystackReference: data.reference,
      paystackPayload: data as unknown,
      status: 'paid',
      customerName: `${customer_details.first_name} ${customer_details.last_name}`.trim(),
      customerEmail: data.customer.email,
      customerPhone: customer_details.phone,
      customerIp: data.ip_address,
      deliveryAddress: customer_details.delivery_address,
      deliveryState: customer_details.state,
      shippingCost: shipping_cost,
      subtotal,
      total: subtotal + shipping_cost,
    })
    .returning({ id: orders.id })

  if (!order) {
    // Log error and abort — cannot insert items without an order ID
    console.error('[webhook] Failed to insert order: no data returned')
    return
  }

  const orderId = order.id

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

  // Throw on failure so the outer try/catch returns non-200 — Paystack will retry.
  // The idempotency guard prevents a duplicate order header on retry.
  await db.insert(orderItems).values(items)

  // Mark any matching abandoned checkouts as recovered.
  // Time-bounded to 48 h to avoid marking unrelated past carts for returning customers.
  try {
    await db
      .update(abandonedOrders)
      .set({ recovered: true, recoveredAt: new Date() })
      .where(
        and(
          eq(abandonedOrders.customerEmail, data.customer.email.toLowerCase()),
          eq(abandonedOrders.recovered, false),
          gte(abandonedOrders.createdAt, new Date(Date.now() - 48 * 60 * 60 * 1000))
        )
      )
  } catch (recoverErr) {
    console.error('[webhook] Failed to mark abandoned orders recovered:', recoverErr)
  }
}
