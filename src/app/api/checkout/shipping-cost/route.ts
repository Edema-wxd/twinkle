import { NextRequest, NextResponse } from 'next/server'
import { getShippingCostFromDb } from '@/lib/checkout/shippingRates'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const state = searchParams.get('state')?.trim()

  if (!state) {
    return NextResponse.json({ error: 'state is required' }, { status: 400 })
  }

  const cost = await getShippingCostFromDb(state)
  return NextResponse.json({ state, cost })
}

