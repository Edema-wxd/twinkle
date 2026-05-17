import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── DB mock ───────────────────────────────────────────────────────────────────
// Must be hoisted before any module import that transitively imports @/db.

const mockSelectChain = {
  from: vi.fn(),
  where: vi.fn(),
}

vi.mock('@/db', () => ({
  db: { select: vi.fn(() => mockSelectChain) },
  settings: { key: 'key', value: 'value' },
}))

// Drizzle operators used inside shippingRates — mock them as pass-through
vi.mock('drizzle-orm', () => ({
  inArray: vi.fn((_col, _vals) => '__inArray__'),
}))

import {
  getShippingRatesFromDb,
  getZoneShippingCostFromDb,
  getShippingCostFromDb,
} from '@/lib/checkout/shippingRates'

function setupDbRows(rows: Array<{ key: string; value: string }>) {
  mockSelectChain.from.mockReturnValue(mockSelectChain)
  mockSelectChain.where.mockResolvedValue(rows)
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── getShippingRatesFromDb ───────────────────────────────────────────────────

describe('getShippingRatesFromDb', () => {
  it('returns rates from the database when present', async () => {
    setupDbRows([
      { key: 'shipping_lagos_rate', value: '2500' },
      { key: 'shipping_other_rate', value: '5000' },
    ])
    const rates = await getShippingRatesFromDb()
    expect(rates.lagosRate).toBe(2500)
    expect(rates.otherRate).toBe(5000)
  })

  it('falls back to defaults when keys are missing', async () => {
    setupDbRows([])
    const rates = await getShippingRatesFromDb()
    expect(rates.lagosRate).toBe(3000)
    expect(rates.otherRate).toBe(4500)
  })

  it('falls back to default for an invalid (non-numeric) stored value', async () => {
    setupDbRows([{ key: 'shipping_lagos_rate', value: 'not-a-number' }])
    const rates = await getShippingRatesFromDb()
    expect(rates.lagosRate).toBe(3000)
  })

  it('uses default when the DB throws', async () => {
    mockSelectChain.from.mockReturnValue(mockSelectChain)
    mockSelectChain.where.mockRejectedValue(new Error('DB down'))
    const rates = await getShippingRatesFromDb()
    expect(rates.lagosRate).toBe(3000)
    expect(rates.otherRate).toBe(4500)
  })
})

// ─── getZoneShippingCostFromDb ────────────────────────────────────────────────

describe('getZoneShippingCostFromDb', () => {
  it('returns the DB-stored rate for a valid zone', async () => {
    setupDbRows([{ key: 'shipping_zone_1_rate', value: '2000' }])
    expect(await getZoneShippingCostFromDb(1)).toBe(2000)
  })

  it('returns the zone defaultFee when the DB key is missing', async () => {
    setupDbRows([])
    // Zone 1 default is 3000
    expect(await getZoneShippingCostFromDb(1)).toBe(3000)
  })

  it('returns the base lagos default (3000) for an unknown zone id', async () => {
    setupDbRows([])
    expect(await getZoneShippingCostFromDb(99)).toBe(3000)
  })
})

// ─── getShippingCostFromDb ────────────────────────────────────────────────────

describe('getShippingCostFromDb', () => {
  it('routes Lagos + known LGA to zone shipping', async () => {
    setupDbRows([{ key: 'shipping_zone_1_rate', value: '1800' }])
    const cost = await getShippingCostFromDb('Lagos', 'Lekki Phase 1')
    expect(cost).toBe(1800)
  })

  it('falls back to lagosRate for Lagos + unknown LGA', async () => {
    setupDbRows([{ key: 'shipping_lagos_rate', value: '3500' }])
    const cost = await getShippingCostFromDb('Lagos', 'Unknown Area')
    expect(cost).toBe(3500)
  })

  it('falls back to lagosRate for Lagos with no LGA', async () => {
    setupDbRows([{ key: 'shipping_lagos_rate', value: '3200' }])
    const cost = await getShippingCostFromDb('Lagos')
    expect(cost).toBe(3200)
  })

  it('uses otherRate for non-Lagos states', async () => {
    setupDbRows([{ key: 'shipping_other_rate', value: '6000' }])
    const cost = await getShippingCostFromDb('Abuja')
    expect(cost).toBe(6000)
  })

  it('uses defaults when DB is empty for any non-Lagos state', async () => {
    setupDbRows([])
    const cost = await getShippingCostFromDb('Kano')
    expect(cost).toBe(4500)
  })
})
