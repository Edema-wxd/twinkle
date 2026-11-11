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
const mockSelectChain = { from: vi.fn(), orderBy: vi.fn() }

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => mockSelectChain),
    insert: vi.fn(() => mockInsertChain),
    update: vi.fn(() => mockUpdateChain),
    delete: vi.fn(() => mockDeleteChain),
  },
  promoCodes: { id: 'id', code: 'code', createdAt: 'created_at' },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => '__eq__'),
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
  // Default: authenticated
  mockSession.mockResolvedValue({ user: { id: 'admin-1' } } as never)
})

// ─── Auth guard ───────────────────────────────────────────────────────────────

describe('auth guard', () => {
  it('GET returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValue(null)
    const res = await GET()
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
    mockSelectChain.from.mockReturnValue(mockSelectChain)
    mockSelectChain.orderBy.mockResolvedValue([sampleCode])
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.codes).toHaveLength(1)
    expect(body.codes[0].code).toBe('FREESHIP')
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
