import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Real Postgres for the subscriber list and email log; Resend is faked. after() runs when the test says.
const { afterCalls, send } = vi.hoisted(() => ({ afterCalls: [] as (() => unknown)[], send: vi.fn() }))
vi.mock('next/server', async (orig) => ({ ...(await orig<typeof import('next/server')>()), after: (fn: () => unknown) => afterCalls.push(fn) }))
vi.mock('@/db', () => import('../../helpers/pgliteDb'))
vi.mock('resend', () => ({
  Resend: class {
    emails = { send }
  },
}))

import { eq } from 'drizzle-orm'
import { db, resetDb, newsletterSubscribers, emailLogs } from '../../helpers/pgliteDb'
import { POST as subscribe } from '@/app/api/newsletter/subscribe/route'
import { POST as confirm } from '@/app/api/newsletter/confirm/route'
import { campaignProgress } from '@/lib/newsletter/campaign'
import { emailToken } from '@/lib/newsletter/unsubscribe'
import { CONFIRM_TEMPLATE_KEY } from '@/lib/newsletter/confirm'
import { WELCOME_TEMPLATE_KEY } from '@/lib/newsletter/welcome'

const req = (url: string, body: object) => new NextRequest(`http://localhost${url}`, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } })
const join = (body: object) => subscribe(req('/api/newsletter/subscribe', { first_name: 'Ada', email: 'ada@example.com', elapsed_ms: 8000, ...body }))
const confirmWith = (e: string, t: string) => confirm(req('/api/newsletter/confirm', { e, t }))
async function runAfter() {
  const fns = afterCalls.splice(0)
  for (const fn of fns) await fn()
}
const sentWith = (key: string) => send.mock.calls.filter(([p]) => p.tags?.some((t: { value: string }) => t.value === key))
const sub = async (email = 'ada@example.com') => (await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.email, email)))[0]

beforeEach(async () => {
  await resetDb()
  afterCalls.length = 0
  send.mockReset().mockResolvedValue({ data: { id: 'msg' }, error: null })
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.stubEnv('RESEND_API_KEY', 're_test')
  vi.stubEnv('RESEND_FROM', 'Twinkle Locs <hello@twinklelocs.com>')
  vi.stubEnv('BETTER_AUTH_SECRET', 'test-secret-test-secret-test-secret')
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://twinklelocs.com')
})

describe('newsletter double opt-in', () => {
  it('saves the sign-up unconfirmed and emails only a confirmation link', async () => {
    const res = await join({ first_name: ' Ada ', email: ' Ada@Example.com ', source_page: '/blog' })
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ ok: true, pending: true })
    expect(await sub()).toMatchObject({ firstName: 'Ada', sourcePage: '/blog', confirmedAt: null })
    await runAfter()
    expect(send).toHaveBeenCalledTimes(1)
    const [payload] = send.mock.calls[0]
    expect(payload.subject).toBe('Confirm your Twinkle Locs newsletter sign-up')
    const link = `https://twinklelocs.com/newsletter/confirm?e=ada%40example.com&amp;t=${emailToken('confirm', 'ada@example.com')}`
    expect(payload.html).toContain(link)
    expect(payload.html).not.toContain('Unsubscribe')
    expect(payload.headers?.['List-Unsubscribe']).toBeUndefined()
    // Not on the list for newsletters yet
    expect((await campaignProgress('00000000-0000-0000-0000-000000000001')).total).toBe(0)
  })

  it('confirming sends the welcome email once and adds them to newsletters', async () => {
    await join({})
    await runAfter()
    const t = emailToken('confirm', 'ada@example.com')
    const res = await confirmWith('ada@example.com', t)
    expect(await res.json()).toEqual({ ok: true, already: false })
    expect((await sub()).confirmedAt).toBeInstanceOf(Date)
    await runAfter()
    expect(sentWith(WELCOME_TEMPLATE_KEY)).toHaveLength(1)

    // Clicking the link again changes nothing and sends nothing
    expect(await (await confirmWith('ada@example.com', t)).json()).toEqual({ ok: true, already: true })
    expect(afterCalls).toHaveLength(0)
    expect((await campaignProgress('00000000-0000-0000-0000-000000000001')).total).toBe(1)
  })

  it('rejects a forged or wrong-purpose token', async () => {
    await join({})
    expect((await confirmWith('ada@example.com', 'nope')).status).toBe(400)
    expect((await confirmWith('ada@example.com', emailToken('unsubscribe', 'ada@example.com'))).status).toBe(400)
    expect((await confirmWith('eve@example.com', emailToken('confirm', 'ada@example.com'))).status).toBe(400)
    expect((await sub()).confirmedAt).toBeNull()
  })

  it('says the sign-up expired when it was removed', async () => {
    expect((await confirmWith('gone@example.com', emailToken('confirm', 'gone@example.com'))).status).toBe(404)
  })

  it('joining again before confirming re-sends the link, but not more than once in 10 minutes', async () => {
    await join({})
    await runAfter()
    const again = await join({})
    expect(again.status).toBe(201)
    await runAfter()
    expect(sentWith(CONFIRM_TEMPLATE_KEY)).toHaveLength(1)

    // 11 minutes later it's sent again
    await db.update(emailLogs).set({ createdAt: new Date(Date.now() - 11 * 60 * 1000) })
    await join({})
    await runAfter()
    expect(sentWith(CONFIRM_TEMPLATE_KEY)).toHaveLength(2)
    expect(await db.$count(newsletterSubscribers)).toBe(1)
  })

  it('tells someone already confirmed that they are on the list', async () => {
    await db.insert(newsletterSubscribers).values({ firstName: 'Ada', email: 'ada@example.com', confirmedAt: new Date() })
    expect((await join({})).status).toBe(409)
    expect(afterCalls).toHaveLength(0)
  })

  it('forgets sign-ups nobody confirmed within 7 days, never confirmed subscribers', async () => {
    const old = new Date(Date.now() - 8 * 86_400_000)
    await db.insert(newsletterSubscribers).values([
      { firstName: 'Stale', email: 'stale@example.com', subscribedAt: old },
      { firstName: 'Loyal', email: 'loyal@example.com', subscribedAt: old, confirmedAt: old },
    ])
    await join({})
    await runAfter()
    const emails = (await db.select({ email: newsletterSubscribers.email }).from(newsletterSubscribers)).map((r) => r.email).sort()
    expect(emails).toEqual(['ada@example.com', 'loyal@example.com'])
  })

  it.each([
    ['fills the hidden field', { website: 'https://spam.example' }],
    ['submits instantly', { elapsed_ms: 200 }],
  ])('looks like success to a bot that %s, but saves and sends nothing', async (_l, extra) => {
    const res = await join({ first_name: 'Bot', email: 'victim@example.com', ...extra })
    expect(res.status).toBe(201)
    expect(await db.$count(newsletterSubscribers)).toBe(0)
    expect(afterCalls).toHaveLength(0)
  })

  it('still works for older pages that don’t send the timing', async () => {
    expect((await subscribe(req('/api/newsletter/subscribe', { first_name: 'Ada', email: 'ada@example.com' }))).status).toBe(201)
    expect(afterCalls).toHaveLength(1)
  })
})
