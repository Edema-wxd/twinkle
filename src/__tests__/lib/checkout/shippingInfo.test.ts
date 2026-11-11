import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── DB mock (hoisted above imports that reach @/db) ──────────────────────────
const { where } = vi.hoisted(() => ({ where: vi.fn() }))
vi.mock('@/db', () => ({
  db: { select: vi.fn(() => ({ from: vi.fn(() => ({ where })) })) },
  settings: { key: 'key', value: 'value' },
}))

import {
  getShippingInfo,
  quoteShipping,
  formatNaira,
  deliveryEstimateForOrder,
  DEFAULT_OTHER_STATES_RATE,
  DEFAULT_OTHER_STATES_DAYS,
} from '@/lib/checkout/shippingInfo'
import { getShippingCostFromDb } from '@/lib/checkout/shippingRates'
import { LAGOS_ZONES } from '@/lib/checkout/shippingZones'

const rows = (r: Record<string, string>) => where.mockResolvedValue(Object.entries(r).map(([key, value]) => ({ key, value })))
const priciestDefault = Math.max(...LAGOS_ZONES.map((z) => z.defaultFee))
const zone1Area = LAGOS_ZONES[0].areas[0] // 'Lekki Phase 1'

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('getShippingInfo', () => {
  it('uses the built-in prices when nothing is set in the admin', async () => {
    rows({})
    const info = await getShippingInfo()
    expect(info.otherRate).toBe(DEFAULT_OTHER_STATES_RATE)
    expect(info.otherDays).toBe(DEFAULT_OTHER_STATES_DAYS)
    expect(info.zones.map((z) => z.fee)).toEqual(LAGOS_ZONES.map((z) => z.defaultFee))
    expect(info.lagosFrom).toBe(Math.min(...LAGOS_ZONES.map((z) => z.defaultFee)))
    expect(info.lagosTo).toBe(priciestDefault)
  })

  it('applies prices set in Admin → Shipping', async () => {
    rows({ shipping_other_rate: '6000', shipping_other_days: '2–4 days', shipping_zone_1_rate: '2500' })
    const info = await getShippingInfo()
    expect(info.otherRate).toBe(6000)
    expect(info.otherDays).toBe('2–4 days')
    expect(info.zones[0].fee).toBe(2500)
    expect(info.lagosFrom).toBe(2500)
  })

  it('ignores invalid stored prices and keeps the default', async () => {
    rows({ shipping_other_rate: 'abc', shipping_zone_1_rate: '-5' })
    const info = await getShippingInfo()
    expect(info.otherRate).toBe(DEFAULT_OTHER_STATES_RATE)
    expect(info.zones[0].fee).toBe(LAGOS_ZONES[0].defaultFee)
  })

  it('falls back to the defaults if the database is down', async () => {
    where.mockRejectedValue(new Error('connection refused'))
    const info = await getShippingInfo()
    expect(info.otherRate).toBe(DEFAULT_OTHER_STATES_RATE)
    expect(info.zones).toHaveLength(LAGOS_ZONES.length)
  })
})

describe('quoteShipping', () => {
  it('prices a Lagos area by its zone', async () => {
    rows({})
    const q = quoteShipping(await getShippingInfo(), 'Lagos', zone1Area)
    expect(q.cost).toBe(LAGOS_ZONES[0].defaultFee)
    expect(q.zone?.id).toBe(1)
    expect(q.deliveryTime).toBe(LAGOS_ZONES[0].deliveryTime)
  })

  it('charges the highest Lagos fee when the area is missing or unknown, so it can never undercharge', async () => {
    rows({})
    const info = await getShippingInfo()
    expect(quoteShipping(info, 'Lagos').cost).toBe(priciestDefault)
    expect(quoteShipping(info, 'Lagos', 'Nowhere Estate').cost).toBe(priciestDefault)
    expect(quoteShipping(info, 'Lagos', 'Nowhere Estate').zone).toBeNull()
  })

  it('charges the flat rate for every other state, whatever area is sent', async () => {
    rows({ shipping_other_rate: '5200' })
    const info = await getShippingInfo()
    expect(quoteShipping(info, 'Abuja').cost).toBe(5200)
    expect(quoteShipping(info, 'Rivers', zone1Area).cost).toBe(5200)
  })

  it('getShippingCostFromDb returns the same price checkout shows', async () => {
    rows({ shipping_zone_1_rate: '2800' })
    expect(await getShippingCostFromDb('Lagos', zone1Area)).toBe(2800)
  })
})

describe('formatting', () => {
  it('formats naira with thousands separators', () => {
    expect(formatNaira(13500)).toBe('₦13,500')
  })

  it('describes delivery for a placed order using the Lagos area from the payment', async () => {
    rows({})
    const info = await getShippingInfo()
    const lagos = deliveryEstimateForOrder(info, 'Lagos', { metadata: { customer_details: { lga: zone1Area } } })
    expect(lagos).toContain(LAGOS_ZONES[0].name)
    expect(deliveryEstimateForOrder(info, 'Lagos', null)).toBe('same day or next day within Lagos')
    expect(deliveryEstimateForOrder(info, 'Kano', null)).toBe(`${DEFAULT_OTHER_STATES_DAYS} to Kano`)
  })
})
