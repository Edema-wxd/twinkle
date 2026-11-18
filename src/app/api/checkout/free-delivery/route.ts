import { NextResponse } from 'next/server'
import { getShippingInfo } from '@/lib/checkout/shippingInfo'

/**
 * Delivery figures for the cart: the free Lagos delivery threshold for the
 * "₦X away from free delivery" note (0 = no offer) and the cheapest Lagos zone
 * fee for "Delivery: from ₦X in Lagos".
 */
export async function GET() {
  const { freeLagosOver, lagosFrom } = await getShippingInfo()
  return NextResponse.json({ freeLagosOver, lagosFrom }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } })
}
