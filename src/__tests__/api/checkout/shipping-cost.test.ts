import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/checkout/shippingRates', () => ({
  getShippingCostFromDb: vi.fn(),
}))

import { GET } from '@/app/api/checkout/shipping-cost/route'
import { getShippingCostFromDb } from '@/lib/checkout/shippingRates'

const mockGetCost = vi.mocked(getShippingCostFromDb)

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
    const body = await res.json()
    expect(body.error).toMatch(/state/i)
  })

  it('returns cost for a state without LGA', async () => {
    mockGetCost.mockResolvedValue(4500)
    const res = await GET(makeRequest({ state: 'Abuja' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.cost).toBe(4500)
    expect(body.state).toBe('Abuja')
    expect(mockGetCost).toHaveBeenCalledWith('Abuja', undefined)
  })

  it('passes LGA to the rate function when provided', async () => {
    mockGetCost.mockResolvedValue(3000)
    const res = await GET(makeRequest({ state: 'Lagos', lga: 'Lekki Phase 1' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.cost).toBe(3000)
    expect(body.lga).toBe('Lekki Phase 1')
    expect(mockGetCost).toHaveBeenCalledWith('Lagos', 'Lekki Phase 1')
  })

  it('trims whitespace from state and lga params', async () => {
    mockGetCost.mockResolvedValue(3000)
    await GET(makeRequest({ state: '  Lagos  ', lga: '  Ikeja  ' }))
    expect(mockGetCost).toHaveBeenCalledWith('Lagos', 'Ikeja')
  })

  it('treats empty LGA param as absent (undefined)', async () => {
    mockGetCost.mockResolvedValue(3000)
    await GET(makeRequest({ state: 'Lagos', lga: '' }))
    expect(mockGetCost).toHaveBeenCalledWith('Lagos', undefined)
  })
})
