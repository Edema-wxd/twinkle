import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Real Postgres (PGlite), so the welcome-code filtering is checked in actual SQL
vi.mock('@/db', () => import('../../helpers/pgliteDb'))
vi.mock('@/lib/auth/server', () => ({ getAdminSession: vi.fn() }))

import { db, resetDb, promoCodes } from '../../helpers/pgliteDb'
import { GET, POST, PUT } from '@/app/api/admin/promo-codes/route'
import { getAdminSession } from '@/lib/auth/server'
import { eq } from 'drizzle-orm'

const mockSession = vi.mocked(getAdminSession)

const get = (search = '') => GET(new NextRequest(`http://localhost/api/admin/promo-codes${search}`))
const send = (method: 'POST' | 'PUT', body: unknown) =>
  (method === 'POST' ? POST : PUT)(
    new NextRequest('http://localhost/api/admin/promo-codes', { method, body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
  )

beforeEach(async () => {
  await resetDb()
  vi.clearAllMocks()
  mockSession.mockResolvedValue({ user: { id: 'admin-1' } } as never)

  await db.insert(promoCodes).values([
    { code: 'FREESHIP', discountType: 'free_shipping', createdAt: new Date('2026-10-01T10:00:00Z') },
    { code: 'TEN', discountType: 'percentage', discountValue: 10, source: 'something-else', createdAt: new Date('2026-10-02T10:00:00Z') },
    {
      code: 'WELCOME-OLD1',
      discountType: 'percentage',
      discountValue: 10,
      maxUses: 1,
      currentUses: 1,
      minOrder: 100_000,
      source: 'welcome',
      issuedToEmail: 'ada@example.com',
      createdAt: new Date('2026-11-01T10:00:00Z'),
    },
    {
      code: 'WELCOME-NEW2',
      discountType: 'percentage',
      discountValue: 10,
      maxUses: 1,
      currentUses: 0,
      minOrder: 100_000,
      source: 'welcome',
      issuedToEmail: 'chi@example.com',
      createdAt: new Date('2026-11-10T10:00:00Z'),
    },
  ])
})

describe('GET /api/admin/promo-codes with welcome codes in the table', () => {
  it('lists only the codes made in Admin, and counts the welcome codes', async () => {
    const body = await (await get()).json()
    expect(body.codes.map((c: { code: string }) => c.code)).toEqual(['FREESHIP', 'TEN'])
    expect(body.welcome).toEqual({ issued: 2, used: 1 })
  })

  it('?source=welcome lists the welcome codes, newest first, with the email each went to', async () => {
    const body = await (await get('?source=welcome')).json()
    expect(body.codes.map((c: { code: string; issuedToEmail: string }) => [c.code, c.issuedToEmail])).toEqual([
      ['WELCOME-NEW2', 'chi@example.com'],
      ['WELCOME-OLD1', 'ada@example.com'],
    ])
    expect(body.codes[0].minOrder).toBe(100_000)
  })

  it('counts zero when the landing page has issued none', async () => {
    await db.delete(promoCodes).where(eq(promoCodes.source, 'welcome'))
    expect((await (await get()).json()).welcome).toEqual({ issued: 0, used: 0 })
  })

  it('returns 401 without an admin session', async () => {
    mockSession.mockResolvedValue(null)
    expect((await get()).status).toBe(401)
    expect((await get('?source=welcome')).status).toBe(401)
  })
})

describe('minimum order on codes made in Admin', () => {
  it('is saved on create and changed on edit', async () => {
    const created = await (await send('POST', { code: 'big10', discountType: 'percentage', discountValue: 10, minOrder: 50000 })).json()
    expect(created.code).toMatchObject({ code: 'BIG10', minOrder: 50000, source: null })

    const updated = await (await send('PUT', { id: created.code.id, minOrder: 0 })).json()
    expect(updated.code.minOrder).toBeNull()

    const [row] = await db.select().from(promoCodes).where(eq(promoCodes.code, 'BIG10'))
    expect(row.minOrder).toBeNull()
  })
})
