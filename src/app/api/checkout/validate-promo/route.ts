import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { promoCodes } from '@/db'
import { eq } from 'drizzle-orm'

type RequestBody = {
  code: string
  subtotal: number
  shippingCost: number
}

export async function POST(req: NextRequest) {
  let body: RequestBody
  try {
    body = (await req.json()) as RequestBody
  } catch {
    return NextResponse.json({ valid: false, error: 'Invalid request body' }, { status: 400 })
  }

  const { code, subtotal, shippingCost } = body

  if (!code || typeof subtotal !== 'number' || typeof shippingCost !== 'number') {
    return NextResponse.json({ valid: false, error: 'Missing required fields' }, { status: 400 })
  }

  const [promo] = await db
    .select()
    .from(promoCodes)
    .where(eq(promoCodes.code, code.toUpperCase().trim()))
    .limit(1)

  if (!promo) {
    return NextResponse.json({ valid: false, error: 'Invalid promo code' })
  }

  if (!promo.isActive) {
    return NextResponse.json({ valid: false, error: 'This promo code is no longer active' })
  }

  if (promo.expiresAt && new Date() > promo.expiresAt) {
    return NextResponse.json({ valid: false, error: 'This promo code has expired' })
  }

  if (promo.maxUses !== null && promo.currentUses >= promo.maxUses) {
    return NextResponse.json({ valid: false, error: 'This promo code has reached its usage limit' })
  }

  let discountAmount = 0

  if (promo.discountType === 'free_shipping') {
    discountAmount = 0 // client sets effectiveShipping to 0; shippingCost is the visible saving
  } else if (promo.discountType === 'percentage') {
    discountAmount = Math.floor((subtotal * promo.discountValue) / 100)
  } else if (promo.discountType === 'fixed') {
    discountAmount = Math.min(promo.discountValue, subtotal)
  }

  return NextResponse.json({
    valid: true,
    discountType: promo.discountType,
    discountAmount,
    shippingSaving: promo.discountType === 'free_shipping' ? shippingCost : 0,
    message:
      promo.discountType === 'free_shipping'
        ? 'Free shipping applied!'
        : `Discount of ₦${discountAmount.toLocaleString()} applied!`,
  })
}
