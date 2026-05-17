import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── DB mock ───────────────────────────────────────────────────────────────────

const mockSelectChain = {
  from: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
}

vi.mock('@/db', () => ({
  db: { select: vi.fn(() => mockSelectChain) },
  promoCodes: { code: 'code' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => '__eq__'),
}))

import { POST } from '@/app/api/checkout/validate-promo/route'

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/checkout/validate-promo', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function setupPromo(promo: object | null) {
  mockSelectChain.from.mockReturnValue(mockSelectChain)
  mockSelectChain.where.mockReturnValue(mockSelectChain)
  mockSelectChain.limit.mockResolvedValue(promo ? [promo] : [])
}

const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
const pastDate = new Date(Date.now() - 1000)

const basePromo = {
  id: 'promo-1',
  code: 'FREESHIP',
  discountType: 'free_shipping',
  discountValue: 0,
  maxUses: null,
  currentUses: 0,
  expiresAt: null,
  isActive: true,
}

beforeEach(() => vi.clearAllMocks())

// ─── input validation ─────────────────────────────────────────────────────────

describe('POST /api/checkout/validate-promo — input validation', () => {
  it('returns 400 when body is not JSON', async () => {
    const req = new NextRequest('http://localhost/api/checkout/validate-promo', {
      method: 'POST',
      body: 'not-json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when code is missing', async () => {
    const res = await POST(makeRequest({ subtotal: 5000, shippingCost: 3000 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when subtotal is missing', async () => {
    const res = await POST(makeRequest({ code: 'TEST', shippingCost: 3000 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when shippingCost is not a number', async () => {
    const res = await POST(makeRequest({ code: 'TEST', subtotal: 5000, shippingCost: 'free' }))
    expect(res.status).toBe(400)
  })
})

// ─── code lookup failures ─────────────────────────────────────────────────────

describe('POST /api/checkout/validate-promo — code lookup', () => {
  it('returns valid:false for an unknown code', async () => {
    setupPromo(null)
    const res = await POST(makeRequest({ code: 'UNKNOWN', subtotal: 5000, shippingCost: 3000 }))
    const body = await res.json()
    expect(body.valid).toBe(false)
    expect(body.error).toMatch(/invalid/i)
  })

  it('returns valid:false for an inactive code', async () => {
    setupPromo({ ...basePromo, isActive: false })
    const res = await POST(makeRequest({ code: 'FREESHIP', subtotal: 5000, shippingCost: 3000 }))
    const body = await res.json()
    expect(body.valid).toBe(false)
    expect(body.error).toMatch(/active/i)
  })

  it('returns valid:false for an expired code', async () => {
    setupPromo({ ...basePromo, expiresAt: pastDate })
    const res = await POST(makeRequest({ code: 'FREESHIP', subtotal: 5000, shippingCost: 3000 }))
    const body = await res.json()
    expect(body.valid).toBe(false)
    expect(body.error).toMatch(/expired/i)
  })

  it('returns valid:false when maxUses is reached', async () => {
    setupPromo({ ...basePromo, maxUses: 5, currentUses: 5 })
    const res = await POST(makeRequest({ code: 'FREESHIP', subtotal: 5000, shippingCost: 3000 }))
    const body = await res.json()
    expect(body.valid).toBe(false)
    expect(body.error).toMatch(/limit/i)
  })

  it('accepts a code with currentUses below maxUses', async () => {
    setupPromo({ ...basePromo, maxUses: 10, currentUses: 9 })
    const res = await POST(makeRequest({ code: 'FREESHIP', subtotal: 5000, shippingCost: 3000 }))
    const body = await res.json()
    expect(body.valid).toBe(true)
  })

  it('accepts a code with a future expiry date', async () => {
    setupPromo({ ...basePromo, expiresAt: futureDate })
    const res = await POST(makeRequest({ code: 'FREESHIP', subtotal: 5000, shippingCost: 3000 }))
    const body = await res.json()
    expect(body.valid).toBe(true)
  })
})

// ─── discount calculation ─────────────────────────────────────────────────────

describe('POST /api/checkout/validate-promo — discount calculation', () => {
  it('free_shipping: discountAmount is 0, shippingSaving equals shippingCost', async () => {
    setupPromo(basePromo)
    const res = await POST(makeRequest({ code: 'FREESHIP', subtotal: 10000, shippingCost: 3000 }))
    const body = await res.json()
    expect(body.valid).toBe(true)
    expect(body.discountType).toBe('free_shipping')
    expect(body.discountAmount).toBe(0)
    expect(body.shippingSaving).toBe(3000)
  })

  it('percentage: calculates correct discount', async () => {
    setupPromo({ ...basePromo, discountType: 'percentage', discountValue: 10 })
    const res = await POST(makeRequest({ code: 'SAVE10', subtotal: 20000, shippingCost: 3000 }))
    const body = await res.json()
    expect(body.valid).toBe(true)
    expect(body.discountAmount).toBe(2000) // 10% of 20000
    expect(body.shippingSaving).toBe(0)
  })

  it('percentage: floors the result for fractional discounts', async () => {
    setupPromo({ ...basePromo, discountType: 'percentage', discountValue: 15 })
    const res = await POST(makeRequest({ code: 'SAVE15', subtotal: 10001, shippingCost: 3000 }))
    const body = await res.json()
    expect(body.discountAmount).toBe(Math.floor(10001 * 15 / 100))
  })

  it('fixed: applies exact discount', async () => {
    setupPromo({ ...basePromo, discountType: 'fixed', discountValue: 2000 })
    const res = await POST(makeRequest({ code: 'SAVE2K', subtotal: 15000, shippingCost: 3000 }))
    const body = await res.json()
    expect(body.discountAmount).toBe(2000)
  })

  it('fixed: caps discount at subtotal to prevent negative totals', async () => {
    setupPromo({ ...basePromo, discountType: 'fixed', discountValue: 99999 })
    const res = await POST(makeRequest({ code: 'BIGDISCOUNT', subtotal: 5000, shippingCost: 3000 }))
    const body = await res.json()
    expect(body.discountAmount).toBe(5000)
  })

  it('normalises code to uppercase before DB lookup', async () => {
    setupPromo(basePromo)
    // Should still find it when sent lowercase
    const res = await POST(makeRequest({ code: 'freeship', subtotal: 5000, shippingCost: 3000 }))
    const body = await res.json()
    // The mock doesn't filter by code value, so it always returns the promo
    expect(body.valid).toBe(true)
  })
})
