import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { LAGOS_ZONES } from '@/lib/checkout/shippingZones'

// The route only needs prices, never a real database connection
vi.mock('@/db', () => ({ db: {}, settings: {} }))

// Fixed prices; the real quoteShipping() decides which one applies
vi.mock('@/lib/checkout/shippingInfo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/checkout/shippingInfo')>()
  const zones = LAGOS_ZONES.map((z) => ({ ...z, fee: z.defaultFee }))
  return {
    ...actual,
    getShippingInfo: vi.fn(async () => ({
      zones,
      lagosFrom: 3000,
      lagosTo: 13500,
      otherRate: 4500,
      otherDays: '3–5 business days',
      intlMessage: '',
      pageIntro: '',
    })),
  }
})

import { GET } from '@/app/api/checkout/shipping-cost/route'

function makeRequest(params: Record<string, string>) {
  const url = new URL('http://localhost/api/checkout/shipping-cost')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new NextRequest(url.toString())
}

beforeEach(() => vi.clearAllMocks())

describe('GET /api/checkout/shipping-cost', () => {
  it('returns 400 when state is missing', async () => {
    const res = await GET(makeRequest({}))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/state/i)
  })

  it('returns the flat rate and delivery time for another state', async () => {
    const res = await GET(makeRequest({ state: 'Abuja' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ state: 'Abuja', cost: 4500, deliveryTime: '3–5 business days', zone: null })
  })

  it('prices a Lagos area by its zone', async () => {
    const body = await (await GET(makeRequest({ state: 'Lagos', lga: 'Lekki Phase 1' }))).json()
    expect(body).toMatchObject({ cost: 3000, lga: 'Lekki Phase 1', zone: { id: 1, name: 'Lekki Corridor' } })
  })

  it('trims whitespace from state and lga params', async () => {
    const body = await (await GET(makeRequest({ state: '  Lagos  ', lga: '  Lekki Phase 1  ' }))).json()
    expect(body).toMatchObject({ state: 'Lagos', lga: 'Lekki Phase 1', cost: 3000 })
  })

  it('treats an empty lga as missing and charges the highest Lagos fee', async () => {
    const body = await (await GET(makeRequest({ state: 'Lagos', lga: '' }))).json()
    expect(body.lga).toBeUndefined()
    expect(body.cost).toBe(13500)
  })
})
