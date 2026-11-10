import { NextRequest, NextResponse } from 'next/server'
import { parseCheckoutMetadata, priceOrder } from '@/lib/payments/paidOrder'

/**
 * Pre-payment check of the bag, using the same pricing the payment webhook
 * uses: current prices, stock/availability per line, shipping and promo.
 * Checkout calls this on the review step and again right before opening
 * Paystack, so customers can't pay for sold-out items or stale prices.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    items?: unknown
    state?: unknown
    lga?: unknown
    promo_code?: unknown
  } | null

  const meta = parseCheckoutMetadata({
    cart_items: body?.items,
    customer_details: {
      first_name: '',
      last_name: '',
      phone: '',
      delivery_address: '',
      state: typeof body?.state === 'string' ? body.state : '',
      lga: typeof body?.lga === 'string' ? body.lga : undefined,
    },
    promo_code: typeof body?.promo_code === 'string' ? body.promo_code : null,
  })
  if (!meta || !meta.customer_details.state) {
    return NextResponse.json({ error: 'items and state are required' }, { status: 400 })
  }

  const priced = await priceOrder(meta)
  return NextResponse.json({
    lines: priced.lines.map((l) => ({
      productId: l.productId,
      variantId: l.variantId,
      tierQty: l.tierQty,
      threadColour: l.threadColour,
      status: l.status,
      unitPrice: l.serverUnitPrice,
    })),
    subtotal: priced.subtotal,
    discount: priced.discount,
    shipping: priced.shipping,
    total: priced.total,
  })
}
