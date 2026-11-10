import { NextRequest, NextResponse } from 'next/server'
import { getShippingInfo, quoteShipping } from '@/lib/checkout/shippingInfo'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const state = searchParams.get('state')?.trim()
  const lga = searchParams.get('lga')?.trim() || undefined

  if (!state) {
    return NextResponse.json({ error: 'state is required' }, { status: 400 })
  }

  const info = await getShippingInfo()
  const { cost, deliveryTime, zone } = quoteShipping(info, state, lga)
  return NextResponse.json({ state, lga, cost, deliveryTime, zone: zone ? { id: zone.id, name: zone.name } : null })
}
