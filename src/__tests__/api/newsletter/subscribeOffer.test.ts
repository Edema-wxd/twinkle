import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// The landing page's welcome code on top of the newsletter sign-up. Real Postgres (PGlite)
// for subscribers, promo codes, settings and the email log; Resend is faked. after() runs when the test says.
const { afterCalls, send } = vi.hoisted(() => ({ afterCalls: [] as (() => unknown)[], send: vi.fn() }))
vi.mock('next/server', async (orig) => ({ ...(await orig<typeof import('next/server')>()), after: (fn: () => unknown) => afterCalls.push(fn) }))
vi.mock('@/db', () => import('../../helpers/pgliteDb'))
vi.mock('resend', () => ({
  Resend: class {
    emails = { send }
  },
}))

import { eq } from 'drizzle-orm'
import { db, resetDb, newsletterSubscribers, promoCodes } from '../../helpers/pgliteDb'
import { POST as subscribe } from '@/app/api/newsletter/subscribe/route'
import { DEFAULT_LANDING_CONFIG } from '@/lib/landing/config'
import { saveLandingConfig } from '@/lib/landing/config.server'
import type { SubscribeResponse } from '@/lib/landing/welcomeOffer'
import { emailToken } from '@/lib/newsletter/unsubscribe'
import { CONFIRM_TEMPLATE_KEY } from '@/lib/newsletter/confirm'
import { WELCOME_CODE_TEMPLATE_KEY } from '@/lib/newsletter/welcomeCodeEmail'
import { WELCOME_CODE_PATTERN } from '@/lib/promo/welcomeCode'

const req = (body: object) =>
  new NextRequest('http://localhost/api/newsletter/subscribe', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } })
const join = (body: object = {}) => subscribe(req({ first_name: 'Ada', email: 'ada@example.com', source_page: 'lp', offer: 'welcome', website: '', elapsed_ms: 8000, ...body }))
async function runAfter() {
  const fns = afterCalls.splice(0)
  for (const fn of fns) await fn()
}
const sentWith = (key: string) => send.mock.calls.filter(([p]) => p.tags?.some((t: { value: string }) => t.value === key)).map(([p]) => p)
const setOffer = (welcomeOffer: Partial<typeof DEFAULT_LANDING_CONFIG.welcomeOffer>) =>
  saveLandingConfig({ ...DEFAULT_LANDING_CONFIG, welcomeOffer: { ...DEFAULT_LANDING_CONFIG.welcomeOffer, ...welcomeOffer } })

// 3pm UTC = 4pm in Lagos, so a 6-hour code runs until 10pm Lagos time
const NOW = new Date('2026-11-18T15:00:00Z')

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  await resetDb()
  afterCalls.length = 0
  send.mockReset().mockResolvedValue({ data: { id: 'msg' }, error: null })
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.stubEnv('RESEND_API_KEY', 're_test')
  vi.stubEnv('RESEND_FROM', 'Twinkle Locs <hello@twinklelocs.com>')
  vi.stubEnv('BETTER_AUTH_SECRET', 'test-secret-test-secret-test-secret')
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://twinklelocs.com')
})

afterEach(() => {
  vi.useRealTimers()
})

describe('welcome code on sign-up (offer on)', () => {
  it('returns a one-use code, saves the subscriber from the landing page and emails the code with the confirm link', async () => {
    const res = await join()
    expect(res.status).toBe(201)
    const body = (await res.json()) as SubscribeResponse
    expect(body).toEqual({
      ok: true,
      pending: true,
      offer: { code: expect.stringMatching(WELCOME_CODE_PATTERN), percent: 10, expiresAt: '2026-11-18T21:00:00.000Z', minOrder: 100_000 },
    })
    const code = body.offer!.code
    const [subscriber] = await db.select().from(newsletterSubscribers)
    expect(subscriber).toMatchObject({ email: 'ada@example.com', sourcePage: 'lp', confirmedAt: null })
    const [promo] = await db.select().from(promoCodes)
    expect(promo).toMatchObject({ code, maxUses: 1, minOrder: 100_000, source: 'welcome', issuedToEmail: 'ada@example.com' })

    // One email: the confirmation, with the code in it (usable without confirming)
    await runAfter()
    expect(send).toHaveBeenCalledTimes(1)
    const [payload] = sentWith(CONFIRM_TEMPLATE_KEY)
    expect(payload.subject).toBe('Confirm your Twinkle Locs sign-up (your 10% code is inside)')
    expect(payload.html).toContain(code)
    expect(payload.html).toContain(`https://twinklelocs.com/newsletter/confirm?e=ada%40example.com&amp;t=${emailToken('confirm', 'ada@example.com')}`)
    expect(payload.html).toContain('https://twinklelocs.com/shop-twinkles')
    expect(payload.text).toContain(code)
    expect(payload.text).toContain('It takes 10% off and works once at checkout, for the next 6 hours (until 10:00pm), on orders of ₦100,000 or more before delivery.')
    expect(payload.html).not.toContain('\u2014') // no em dashes in the copy
  })

  it('gives the same code again, without emailing it twice in a few minutes', async () => {
    const first = (await (await join()).json()) as SubscribeResponse
    await runAfter()
    const again = await join()
    expect(again.status).toBe(201)
    expect(((await again.json()) as SubscribeResponse).offer).toEqual(first.offer)
    await runAfter()
    expect(send).toHaveBeenCalledTimes(1)
    expect(await db.$count(promoCodes)).toBe(1)
  })

  it('sends the code on its own when a confirmation without it went out minutes ago', async () => {
    // Joined from the blog footer first (no offer), then from the landing page
    await join({ offer: undefined, source_page: '/blog' })
    await runAfter()
    const body = (await (await join()).json()) as SubscribeResponse
    await runAfter()
    expect(sentWith(CONFIRM_TEMPLATE_KEY)).toHaveLength(1)
    const codeEmails = sentWith(WELCOME_CODE_TEMPLATE_KEY)
    expect(codeEmails).toHaveLength(1)
    expect(codeEmails[0].subject).toBe(`Your 10% off code: ${body.offer!.code}`)
    expect(codeEmails[0].text).toContain('https://twinklelocs.com/shop-twinkles')
  })

  it('gives an already-confirmed subscriber 200 with their code, and emails just the code', async () => {
    await db.insert(newsletterSubscribers).values({ firstName: 'Adaeze', email: 'ada@example.com', confirmedAt: new Date() })
    const res = await join({ email: 'ADA@example.com' })
    expect(res.status).toBe(200)
    const body = (await res.json()) as SubscribeResponse
    expect(body).toMatchObject({ ok: true, pending: false, offer: { percent: 10, minOrder: 100_000 } })
    await runAfter()
    expect(sentWith(CONFIRM_TEMPLATE_KEY)).toHaveLength(0)
    const [email] = sentWith(WELCOME_CODE_TEMPLATE_KEY)
    expect(email.to).toEqual(['ada@example.com'])
    expect(email.html).toContain(body.offer!.code)
    expect(email.html).toContain('Hi Adaeze,')
    expect(email.text).toContain('for the next 6 hours (until 10:00pm)')
    expect(email.text).toContain('₦100,000 or more')
    // Still a newsletter subscriber, nothing else changed
    expect((await db.select().from(newsletterSubscribers))[0].confirmedAt).toBeInstanceOf(Date)
  })

  it('says so when this email has already used its welcome code', async () => {
    const first = (await (await join()).json()) as SubscribeResponse
    await db.update(promoCodes).set({ currentUses: 1 }).where(eq(promoCodes.code, first.offer!.code))
    const res = await join()
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'This email has already used its welcome code.' })
    expect(await db.$count(promoCodes)).toBe(1)
  })

  it('uses the percent, hours and minimum set in Admin', async () => {
    await setOffer({ percent: 15, expiryHours: 2, minOrder: 0 })
    const body = (await (await join()).json()) as SubscribeResponse
    expect(body.offer).toMatchObject({ percent: 15, expiresAt: '2026-11-18T17:00:00.000Z', minOrder: 0 })
    await runAfter()
    const [payload] = sentWith(CONFIRM_TEMPLATE_KEY)
    expect(payload.text).toContain('It takes 15% off and works once at checkout, for the next 2 hours (until 6:00pm).')
    expect(payload.text).not.toContain('₦')
  })

  it('gives a bot the usual fake success and no code', async () => {
    for (const extra of [{ website: 'https://spam.example' }, { elapsed_ms: 200 }]) {
      const res = await join({ email: 'victim@example.com', ...extra })
      expect(res.status).toBe(201)
      expect(await res.json()).toEqual({ ok: true, pending: true })
    }
    expect(await db.$count(promoCodes)).toBe(0)
    expect(await db.$count(newsletterSubscribers)).toBe(0)
    expect(afterCalls).toHaveLength(0)
  })
})

describe('welcome code off, or not asked for', () => {
  it('with the offer switched off, behaves exactly like a plain sign-up', async () => {
    await setOffer({ enabled: false })
    const res = await join()
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ ok: true, pending: true })
    await runAfter()
    expect(sentWith(CONFIRM_TEMPLATE_KEY)[0].subject).toBe('Confirm your Twinkle Locs newsletter sign-up')
    expect(await db.$count(promoCodes)).toBe(0)

    await db.update(newsletterSubscribers).set({ confirmedAt: new Date() })
    const again = await join()
    expect(again.status).toBe(409)
    expect(await again.json()).toEqual({ error: 'already subscribed' })
  })

  it('without offer in the request, no code is made and the confirmation has none', async () => {
    const res = await join({ offer: undefined })
    expect(await res.json()).toEqual({ ok: true, pending: true })
    await runAfter()
    const [payload] = sentWith(CONFIRM_TEMPLATE_KEY)
    expect(payload.subject).toBe('Confirm your Twinkle Locs newsletter sign-up')
    expect(payload.text).not.toContain('TWINKLE-')
    expect(await db.$count(promoCodes)).toBe(0)
  })
})
