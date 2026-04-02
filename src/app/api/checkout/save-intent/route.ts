import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database, AbandonedOrderInsert } from '@/types/supabase'
import { getShippingCost } from '@/lib/checkout/shipping'

interface SaveIntentBody {
  customerName: string
  customerEmail: string
  customerPhone: string
  deliveryAddress: string
  deliveryState: string
  cartItems: unknown[]
  subtotal: number
}

export async function POST(req: NextRequest) {
  let body: SaveIntentBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    customerName,
    customerEmail,
    customerPhone,
    deliveryAddress,
    deliveryState,
    cartItems,
    subtotal,
  } = body

  // Basic validation — all fields required
  if (
    !customerName?.trim() ||
    !customerEmail?.trim() ||
    !customerPhone?.trim() ||
    !deliveryAddress?.trim() ||
    !deliveryState?.trim() ||
    !Array.isArray(cartItems) ||
    cartItems.length === 0 ||
    typeof subtotal !== 'number'
  ) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const shippingCost = getShippingCost(deliveryState)
  const total = subtotal + shippingCost

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  )

  const insert: AbandonedOrderInsert = {
    customer_name: customerName.trim(),
    customer_email: customerEmail.trim().toLowerCase(),
    customer_phone: customerPhone.trim(),
    delivery_address: deliveryAddress.trim(),
    delivery_state: deliveryState,
    shipping_cost: shippingCost,
    subtotal,
    total,
    cart_items: cartItems as Database['public']['Tables']['abandoned_orders']['Insert']['cart_items'],
  }

  const { data, error } = await supabase
    .from('abandoned_orders')
    .insert(insert)
    .select('id')
    .single()

  if (error || !data) {
    console.error('[save-intent] Failed to insert abandoned order:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id }, { status: 201 })
}
