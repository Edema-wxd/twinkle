import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { abandonedOrders } from '@/db'
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

  try {
    const [data] = await db.insert(abandonedOrders).values({
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim().toLowerCase(),
      customerPhone: customerPhone.trim(),
      deliveryAddress: deliveryAddress.trim(),
      deliveryState: deliveryState,
      shippingCost: shippingCost.toString(),
      subtotal: subtotal.toString(),
      total: total.toString(),
      cartItems: cartItems as unknown,
    }).returning({ id: abandonedOrders.id })

    if (!data) {
      console.error('[save-intent] Failed to insert abandoned order: no data returned')
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
    }

    return NextResponse.json({ id: data.id }, { status: 201 })
  } catch (err) {
    console.error('[save-intent] Failed to insert abandoned order:', err)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
