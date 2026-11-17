import { NextResponse } from 'next/server'
import { getShippingInfo } from '@/lib/checkout/shippingInfo'

/** The free Lagos delivery threshold, for the cart's "₦X away from free delivery" note. 0 = no offer. */
export async function GET() {
  const { freeLagosOver } = await getShippingInfo()
  return NextResponse.json({ freeLagosOver }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } })
}
