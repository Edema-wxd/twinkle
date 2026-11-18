import { describe, it, expect, vi, beforeEach } from 'vitest'

// The route only needs the shipping figures, never a real database connection
vi.mock('@/db', () => ({ db: {}, settings: {} }))

const getShippingInfo = vi.fn()
vi.mock('@/lib/checkout/shippingInfo', () => ({ getShippingInfo: () => getShippingInfo() }))

import { GET } from '@/app/api/checkout/free-delivery/route'

const info = (over: Record<string, unknown>) => ({
  zones: [],
  lagosFrom: 3000,
  lagosTo: 13500,
  otherRate: 4500,
  otherDays: '3-5 business days',
  intlMessage: '',
  pageIntro: '',
  freeLagosOver: 100000,
  ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
  getShippingInfo.mockResolvedValue(info({}))
})

describe('GET /api/checkout/free-delivery', () => {
  it('returns the free Lagos delivery threshold and the cheapest Lagos delivery fee', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ freeLagosOver: 100000, lagosFrom: 3000 })
  })

  it('passes through a switched-off offer (0) and the admin-set Lagos fee', async () => {
    getShippingInfo.mockResolvedValue(info({ freeLagosOver: 0, lagosFrom: 2500 }))
    expect(await (await GET()).json()).toEqual({ freeLagosOver: 0, lagosFrom: 2500 })
  })

  it('is cacheable at the edge', async () => {
    const res = await GET()
    expect(res.headers.get('Cache-Control')).toMatch(/s-maxage=300/)
  })
})
