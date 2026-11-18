import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Auth mock ─────────────────────────────────────────────────────────────────

vi.mock('@/lib/auth/server', () => ({
  getAdminSession: vi.fn(),
}))

// ── DB mock ───────────────────────────────────────────────────────────────────

const mockInsertChain = { values: vi.fn() }
const mockUpdateChain = { set: vi.fn() }
const mockDeleteReturning = { returning: vi.fn() }
const mockDeleteChain = { where: vi.fn(() => mockDeleteReturning) }

// Each db.select() resolves to the next queued result, whatever is chained on it
const selectResults: unknown[][] = []
function mockSelectChain() {
  const result = selectResults.shift() ?? []
  const chain: Record<string, unknown> = {}
  for (const m of ['from', 'where', 'orderBy', 'limit']) chain[m] = vi.fn(() => chain)
  chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => Promise.resolve(result).then(resolve, reject)
  return chain
}

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => mockSelectChain()),
    insert: vi.fn(() => mockInsertChain),
    update: vi.fn(() => mockUpdateChain),
    delete: vi.fn(() => mockDeleteChain),
  },
  promoCodes: { id: 'id', code: 'code', createdAt: 'created_at', source: 'source', currentUses: 'current_uses' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => '__eq__'),
  desc: vi.fn(() => '__desc__'),
  sql: vi.fn(() => '__sql__'),
}))

import { GET, POST, PUT, DELETE } from '@/app/api/admin/promo-codes/route'
import { getAdminSession } from '@/lib/auth/server'

const mockSession = vi.mocked(getAdminSession)

function makeRequest(method: string, body?: object, search?: string) {
  const url = `http://localhost/api/admin/promo-codes${search ?? ''}`
  return new NextRequest(url, {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
  })
}

const sampleCode = {
  id: 'uuid-1',
  code: 'FREESHIP',
  discountType: 'free_shipping',
  discountValue: 0,
  maxUses: null,
  currentUses: 0,
  expiresAt: null,
  isActive: true,
  createdAt: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
  selectResults.length = 0
  // Default: authenticated
  mockSession.mockResolvedValue({ user: { id: 'admin-1' } } as never)
})

// ─── Auth guard ───────────────────────────────────────────────────────────────

describe('auth guard', () => {
  it('GET returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null)
    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(401)
  })

  it('POST returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null)
    const res = await POST(makeRequest('POST', { code: 'TEST', discountType: 'free_shipping' }))
    expect(res.status).toBe(401)
  })

  it('PUT returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null)
    const res = await PUT(makeRequest('PUT', { id: 'uuid-1', isActive: false }))
    expect(res.status).toBe(401)
  })

  it('DELETE returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null)
    const res = await DELETE(makeRequest('DELETE', undefined, '?id=uuid-1'))
    expect(res.status).toBe(401)
  })
})

// ─── GET ─────────────────────────────────────────────────────────────────────

describe('GET /api/admin/promo-codes', () => {
  it('returns the list of codes', async () => {
    selectResults.push([sampleCode], [{ issued: 0, used: 0 }])
    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.codes).toHaveLength(1)
    expect(body.codes[0].code).toBe('FREESHIP')
  })

  it('adds a count of the landing page welcome codes instead of listing them', async () => {
    selectResults.push([sampleCode], [{ issued: 12, used: 3 }])
    const body = await (await GET(makeRequest('GET'))).json()
    expect(body.welcome).toEqual({ issued: 12, used: 3 })
  })

  it('?source=welcome returns the welcome codes with who they were issued to', async () => {
    const welcomeCode = { ...sampleCode, id: 'uuid-w', code: 'WELCOME-AB12', source: 'welcome', issuedToEmail: 'ada@example.com' }
    selectResults.push([welcomeCode])
    const body = await (await GET(makeRequest('GET', undefined, '?source=welcome'))).json()
    expect(body.codes).toEqual([expect.objectContaining({ code: 'WELCOME-AB12', issuedToEmail: 'ada@example.com' })])
    expect(body.welcome).toBeUndefined()
  })
})

// ─── POST ────────────────────────────────────────────────────────────────────

describe('POST /api/admin/promo-codes', () => {
  beforeEach(() => {
    const returningMock = { returning: vi.fn().mockResolvedValue([sampleCode]) }
    mockInsertChain.values.mockReturnValue(returningMock)
  })

  it('creates a code and returns 201', async () => {
    const res = await POST(
      makeRequest('POST', { code: 'freeship', discountType: 'free_shipping', discountValue: 0 })
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.code.code).toBe('FREESHIP')
  })

  it('uppercases the code before saving', async () => {
    await POST(makeRequest('POST', { code: 'lowercase', discountType: 'free_shipping' }))
    const valuesCall = mockInsertChain.values.mock.calls[0][0]
    expect(valuesCall.code).toBe('LOWERCASE')
  })

  it('returns 400 when code is missing', async () => {
    const res = await POST(makeRequest('POST', { discountType: 'free_shipping' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid discountType', async () => {
    const res = await POST(
      makeRequest('POST', { code: 'TEST', discountType: 'invalid_type' })
    )
    expect(res.status).toBe(400)
  })

  it('defaults isActive to true', async () => {
    await POST(makeRequest('POST', { code: 'TEST', discountType: 'fixed', discountValue: 1000 }))
    const valuesCall = mockInsertChain.values.mock.calls[0][0]
    expect(valuesCall.isActive).toBe(true)
  })

  it('stores null for maxUses when not provided', async () => {
    await POST(makeRequest('POST', { code: 'TEST', discountType: 'free_shipping' }))
    const valuesCall = mockInsertChain.values.mock.calls[0][0]
    expect(valuesCall.maxUses).toBeNull()
  })

  it('stores a minimum order, and none for blank or 0', async () => {
    await POST(makeRequest('POST', { code: 'BIG', discountType: 'percentage', discountValue: 10, minOrder: 50000 }))
    expect(mockInsertChain.values.mock.calls[0][0].minOrder).toBe(50000)
    await POST(makeRequest('POST', { code: 'ANY', discountType: 'percentage', discountValue: 10, minOrder: 0 }))
    expect(mockInsertChain.values.mock.calls[1][0].minOrder).toBeNull()
    await POST(makeRequest('POST', { code: 'ANY2', discountType: 'percentage', discountValue: 10 }))
    expect(mockInsertChain.values.mock.calls[2][0].minOrder).toBeNull()
  })

  it('returns 400 for a minimum order that is not a whole number of naira', async () => {
    for (const minOrder of [-1, 99.5, 'lots']) {
      const res = await POST(makeRequest('POST', { code: 'BAD', discountType: 'fixed', discountValue: 1000, minOrder }))
      expect(res.status).toBe(400)
    }
    expect(mockInsertChain.values).not.toHaveBeenCalled()
  })

  it('stores null for expiresAt when not provided', async () => {
    await POST(makeRequest('POST', { code: 'TEST', discountType: 'free_shipping' }))
    const valuesCall = mockInsertChain.values.mock.calls[0][0]
    expect(valuesCall.expiresAt).toBeNull()
  })
})

// ─── PUT ─────────────────────────────────────────────────────────────────────

describe('PUT /api/admin/promo-codes', () => {
  beforeEach(() => {
    const whereMock = { where: vi.fn() }
    const returningMock = { returning: vi.fn().mockResolvedValue([sampleCode]) }
    whereMock.where.mockReturnValue(returningMock)
    mockUpdateChain.set.mockReturnValue(whereMock)
  })

  it('returns 400 when id is missing', async () => {
    const res = await PUT(makeRequest('PUT', { isActive: false }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when no fields are provided', async () => {
    const res = await PUT(makeRequest('PUT', { id: 'uuid-1' }))
    expect(res.status).toBe(400)
  })

  it('updates isActive when provided', async () => {
    const res = await PUT(makeRequest('PUT', { id: 'uuid-1', isActive: false }))
    expect(res.status).toBe(200)
    const setCall = mockUpdateChain.set.mock.calls[0][0]
    expect(setCall.isActive).toBe(false)
  })

  it('updates the minimum order, and clears it with null', async () => {
    await PUT(makeRequest('PUT', { id: 'uuid-1', minOrder: 100000 }))
    expect(mockUpdateChain.set.mock.calls[0][0]).toEqual({ minOrder: 100000 })
    await PUT(makeRequest('PUT', { id: 'uuid-1', minOrder: null }))
    expect(mockUpdateChain.set.mock.calls[1][0]).toEqual({ minOrder: null })
  })

  it('returns 400 for an invalid minimum order on update', async () => {
    const res = await PUT(makeRequest('PUT', { id: 'uuid-1', minOrder: 'abc' }))
    expect(res.status).toBe(400)
    expect(mockUpdateChain.set).not.toHaveBeenCalled()
  })

  it('uppercases code on update', async () => {
    await PUT(makeRequest('PUT', { id: 'uuid-1', code: 'newcode' }))
    const setCall = mockUpdateChain.set.mock.calls[0][0]
    expect(setCall.code).toBe('NEWCODE')
  })
})

// ─── DELETE ──────────────────────────────────────────────────────────────────

describe('DELETE /api/admin/promo-codes', () => {
  beforeEach(() => {
    mockDeleteReturning.returning.mockResolvedValue([{ id: 'uuid-1' }])
  })

  it('returns 400 when id query param is missing', async () => {
    const res = await DELETE(makeRequest('DELETE'))
    expect(res.status).toBe(400)
  })

  it('deletes the code and returns the deleted id', async () => {
    const res = await DELETE(makeRequest('DELETE', undefined, '?id=uuid-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deleted).toBe('uuid-1')
  })
})
