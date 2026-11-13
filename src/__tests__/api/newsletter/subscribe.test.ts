import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { inserted, afterCalls, dup } = vi.hoisted(() => ({ inserted: [] as unknown[], afterCalls: [] as (() => unknown)[], dup: { on: false } }))

vi.mock('next/server', async (orig) => ({ ...(await orig<typeof import('next/server')>()), after: (fn: () => unknown) => afterCalls.push(fn) }))
vi.mock('@/db', () => ({
  db: {
    insert: () => ({
      values: async (v: unknown) => {
        if (dup.on) throw Object.assign(new Error('Failed query'), { cause: { code: '23505' } })
        inserted.push(v)
      },
    }),
  },
  newsletterSubscribers: {},
}))
vi.mock('@/lib/newsletter/welcome', () => ({ sendWelcomeEmail: vi.fn(async () => 'sent') }))

import { POST } from '@/app/api/newsletter/subscribe/route'
import { sendWelcomeEmail } from '@/lib/newsletter/welcome'

const post = (body: object) => POST(new NextRequest('http://localhost/api/newsletter/subscribe', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }))

beforeEach(() => {
  inserted.length = 0
  afterCalls.length = 0
  dup.on = false
  vi.mocked(sendWelcomeEmail).mockClear()
})

describe('POST /api/newsletter/subscribe', () => {
  it('saves a real person and sends them the welcome email after responding', async () => {
    const res = await post({ first_name: ' Ada ', email: ' Ada@Example.com ', source_page: '/blog', website: '', elapsed_ms: 8000 })
    expect(res.status).toBe(201)
    expect(inserted).toEqual([{ firstName: 'Ada', email: 'ada@example.com', sourcePage: '/blog' }])
    expect(afterCalls).toHaveLength(1)
    await afterCalls[0]()
    expect(sendWelcomeEmail).toHaveBeenCalledWith('ada@example.com', 'Ada')
  })

  it.each([
    ['fills the hidden field', { website: 'https://spam.example' }],
    ['submits instantly', { elapsed_ms: 200 }],
  ])('looks like success to a bot that %s, but saves and sends nothing', async (_l, extra) => {
    const res = await post({ first_name: 'Bot', email: 'victim@example.com', ...extra })
    expect(res.status).toBe(201)
    expect(inserted).toEqual([])
    expect(afterCalls).toHaveLength(0)
  })

  it('still works for older pages that don’t send the timing (no welcome blocked by a cached script)', async () => {
    expect((await post({ first_name: 'Ada', email: 'ada@example.com' })).status).toBe(201)
    expect(afterCalls).toHaveLength(1)
  })

  it('does not welcome someone already on the list', async () => {
    dup.on = true
    const res = await post({ first_name: 'Ada', email: 'ada@example.com', elapsed_ms: 5000 })
    expect(res.status).toBe(409)
    expect(afterCalls).toHaveLength(0)
  })
})
