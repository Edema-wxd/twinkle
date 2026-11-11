import { NextRequest } from 'next/server'
import { getPublicOrder } from '@/lib/orders/publicOrder'

/** Polled by the order page while a payment is being confirmed. Returns only what that page shows. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params
  const order = await getPublicOrder(reference)
  if (!order) return Response.json(null, { status: 404, headers: { 'Cache-Control': 'no-store' } })
  return Response.json(order, { headers: { 'Cache-Control': 'no-store' } })
}
