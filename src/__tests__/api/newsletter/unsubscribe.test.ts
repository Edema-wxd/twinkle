import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { deleted } = vi.hoisted(() => ({ deleted: [] as unknown[] }))
vi.mock('@/db', () => ({
  db: { delete: vi.fn(() => ({ where: vi.fn(async (cond: unknown) => { deleted.push(cond) }) })) },
  newsletterSubscribers: { email: 'email' },
}))
vi.mock('drizzle-orm', () => ({ eq: vi.fn((_c, v) => v) }))

import { POST, GET } from '@/app/api/newsletter/unsubscribe/route'
import { unsubscribeToken } from '@/lib/newsletter/unsubscribe'

const url = (q: Record<string, string>) => `http://localhost/api/newsletter/unsubscribe?${new URLSearchParams(q)}`

beforeEach(() => {
  vi.stubEnv('BETTER_AUTH_SECRET', 'test-secret-for-unsubscribe-tokens')
  deleted.length = 0
})

describe('/api/newsletter/unsubscribe', () => {
  it('one-click POST (Gmail/Yahoo) with the signed link deletes the subscriber', async () => {
    const t = unsubscribeToken('ada@example.com')
    const res = await POST(new NextRequest(url({ e: 'ada@example.com', t }), { method: 'POST', body: 'List-Unsubscribe=One-Click', headers: { 'content-type': 'application/x-www-form-urlencoded' } }))
    expect(res.status).toBe(200)
    expect(deleted).toEqual(['ada@example.com'])
  })

  it('the confirm page POST (JSON body) works too', async () => {
    const t = unsubscribeToken('ada@example.com')
    const res = await POST(new NextRequest('http://localhost/api/newsletter/unsubscribe', { method: 'POST', body: JSON.stringify({ e: 'Ada@Example.com', t }), headers: { 'content-type': 'application/json' } }))
    expect(res.status).toBe(200)
    expect(deleted).toEqual(['ada@example.com'])
  })

  it('refuses a forged or edited link and deletes nothing', async () => {
    const t = unsubscribeToken('ada@example.com')
    const res = await POST(new NextRequest(url({ e: 'bisi@example.com', t }), { method: 'POST' }))
    expect(res.status).toBe(400)
    expect(deleted).toEqual([])
  })

  it('opening the link (GET, e.g. an email scanner) only redirects to the confirm page', async () => {
    const t = unsubscribeToken('ada@example.com')
    const res = await GET(new NextRequest(url({ e: 'ada@example.com', t })))
    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toMatch(/\/unsubscribe\?e=ada%40example\.com&t=/)
    expect(deleted).toEqual([])
  })
})
