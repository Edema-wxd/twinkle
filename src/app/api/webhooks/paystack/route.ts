import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database, OrderInsert, OrderItemInsert } from '@/types/supabase'

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
  const event: PaystackEvent = JSON.parse(body)

  // 4. Handle charge.success — await to ensure DB write completes before
  //    returning 200 (Paystack allows up to 10 seconds; two inserts are fast)
  if (event.event === 'charge.success') {
    await handleChargeSuccess(event.data)
  }

  return NextResponse.json({ received: true }, { status: 200 })
}

// ── Order creation ───────────────────────────────────────────────────────────

async function handleChargeSuccess(data: PaystackChargeData) {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  )

  // Idempotency guard — ignore duplicate webhook fires
  const existing = await supabase
    .from('orders')
    .select('id')
    .eq('paystack_reference', data.reference)
    .maybeSingle()

  if (existing.data) {
    // Order already created from a previous delivery of this webhook
    return
  }

  const { customer_details, cart_items, subtotal, shipping_cost } = data.metadata

  const orderInsert: OrderInsert = {
    paystack_reference: data.reference,
    paystack_payload: JSON.parse(JSON.stringify(data)) as Database['public']['Tables']['orders']['Insert']['paystack_payload'],
    status: 'paid',
    customer_name: `${customer_details.first_name} ${customer_details.last_name}`.trim(),
    customer_email: data.customer.email,
    customer_phone: customer_details.phone,
    customer_ip: data.ip_address,
    delivery_address: customer_details.delivery_address,
    delivery_state: customer_details.state,
    shipping_cost,
    subtotal,
    total: subtotal + shipping_cost,
  }

  const orderResult = await supabase
    .from('orders')
    .insert(orderInsert)
    .select('id')
    .single()

  if (orderResult.error || !orderResult.data) {
    // Log error — cannot throw from fire-and-forget context
    console.error('[webhook] Failed to insert order:', orderResult.error)
    return
  }

  const orderId = orderResult.data.id

  const orderItems: OrderItemInsert[] = cart_items.map((item) => ({
    order_id: orderId,
    product_id: item.productId,
    product_name: item.productName,
    variant_id: item.variantId,
    variant_name: item.variantName,
    tier_qty: item.tierQty,
    thread_colour: item.isTool ? null : item.threadColour,
    unit_price: item.unitPrice,
    quantity: item.quantity,
    line_total: item.unitPrice * item.quantity,
  }))

  const itemsResult = await supabase.from('order_items').insert(orderItems)

  if (itemsResult.error) {
    console.error('[webhook] Failed to insert order_items:', itemsResult.error)
  }
}
