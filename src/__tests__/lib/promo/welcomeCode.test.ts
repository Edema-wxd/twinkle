import { describe, it, expect, vi, beforeEach } from 'vitest'

// Real Postgres (PGlite) for promo_codes, so the unique index does the race protection for real
vi.mock('@/db', () => import('../../helpers/pgliteDb'))

import { eq } from 'drizzle-orm'
import { db, resetDb, promoCodes } from '../../helpers/pgliteDb'
import {
  issueWelcomeCode,
  candidateWelcomeCode,
  randomWelcomeCode,
  WELCOME_CODE_PATTERN,
  WELCOME_CODE_USED_MESSAGE,
} from '@/lib/promo/welcomeCode'
import { WELCOME_OFFER_SOURCE } from '@/lib/landing/welcomeOffer'

const HOUR = 60 * 60 * 1000
const opts = { percent: 10, expiryHours: 6, minOrder: 100_000 }
const welcomeRows = (email = 'ada@example.com') => db.select().from(promoCodes).where(eq(promoCodes.issuedToEmail, email))

beforeEach(async () => {
  await resetDb()
  vi.stubEnv('BETTER_AUTH_SECRET', 'test-secret-test-secret-test-secret')
})

describe('issueWelcomeCode', () => {
  it('issues a readable one-use code that lasts the configured hours and carries the minimum', async () => {
    const now = new Date('2026-11-18T15:00:00Z')
    const r = await issueWelcomeCode(' Ada@Example.com ', { ...opts, now })
    expect(r.status).toBe('issued')
    if (r.status === 'refused') throw new Error('refused')
    expect(r.offer.code).toMatch(WELCOME_CODE_PATTERN)
    expect(r.offer).toEqual({ code: r.offer.code, percent: 10, expiresAt: new Date(now.getTime() + 6 * HOUR).toISOString(), minOrder: 100_000 })

    const [row] = await welcomeRows()
    expect(row).toMatchObject({
      code: r.offer.code,
      discountType: 'percentage',
      discountValue: 10,
      maxUses: 1,
      currentUses: 0,
      minOrder: 100_000,
      isActive: true,
      source: WELCOME_OFFER_SOURCE,
      issuedToEmail: 'ada@example.com',
    })
    expect(row.expiresAt?.getTime()).toBe(now.getTime() + 6 * HOUR)
  })

  it('stores no minimum when the offer has none', async () => {
    const r = await issueWelcomeCode('ada@example.com', { ...opts, minOrder: 0 })
    if (r.status === 'refused') throw new Error('refused')
    expect(r.offer.minOrder).toBe(0)
    expect((await welcomeRows())[0].minOrder).toBeNull()
  })

  it('gives the same email the same code again, without a new row', async () => {
    const first = await issueWelcomeCode('ada@example.com', opts)
    const again = await issueWelcomeCode('ADA@example.com', { ...opts, percent: 25 })
    expect(again.status).toBe('existing')
    if (first.status === 'refused' || again.status === 'refused') throw new Error('refused')
    // The code as issued (its own percent), not today's setting
    expect(again.offer).toEqual(first.offer)
    expect(await db.$count(promoCodes)).toBe(1)
  })

  it('refuses a second code once the welcome code was used, even after it expired', async () => {
    const first = await issueWelcomeCode('ada@example.com', opts)
    if (first.status === 'refused') throw new Error('refused')
    await db.update(promoCodes).set({ currentUses: 1 }).where(eq(promoCodes.code, first.offer.code))
    expect(await issueWelcomeCode('ada@example.com', opts)).toEqual({ status: 'refused', reason: 'used', message: WELCOME_CODE_USED_MESSAGE })

    await db.update(promoCodes).set({ expiresAt: new Date(Date.now() - HOUR) })
    expect((await issueWelcomeCode('ada@example.com', opts)).status).toBe('refused')
    expect(await db.$count(promoCodes)).toBe(1)
  })

  it('issues a fresh code when the last one expired unused', async () => {
    const first = await issueWelcomeCode('ada@example.com', opts)
    if (first.status === 'refused') throw new Error('refused')
    await db.update(promoCodes).set({ expiresAt: new Date(Date.now() - 1000) })

    const fresh = await issueWelcomeCode('ada@example.com', opts)
    expect(fresh.status).toBe('issued')
    if (fresh.status === 'refused') throw new Error('refused')
    expect(fresh.offer.code).not.toBe(first.offer.code)
    expect(new Date(fresh.offer.expiresAt).getTime()).toBeGreaterThan(Date.now() + 5 * HOUR)
    expect(await db.$count(promoCodes)).toBe(2)
    // And that one is returned from now on
    const again = await issueWelcomeCode('ada@example.com', opts)
    expect(again.status === 'existing' && again.offer.code).toBe(fresh.offer.code)
  })

  it('does not replace a code that was switched off in Admin', async () => {
    await issueWelcomeCode('ada@example.com', opts)
    await db.update(promoCodes).set({ isActive: false })
    const r = await issueWelcomeCode('ada@example.com', opts)
    expect(r).toMatchObject({ status: 'refused', reason: 'revoked' })
    expect(await db.$count(promoCodes)).toBe(1)
  })

  it('gives each email its own code', async () => {
    const a = await issueWelcomeCode('ada@example.com', opts)
    const b = await issueWelcomeCode('bola@example.com', opts)
    if (a.status === 'refused' || b.status === 'refused') throw new Error('refused')
    expect(a.offer.code).not.toBe(b.offer.code)
  })

  it('ignores Admin-made codes, even with the same email on them', async () => {
    await db.insert(promoCodes).values({ code: 'SUMMER10', discountType: 'percentage', discountValue: 10, currentUses: 3, issuedToEmail: 'ada@example.com' })
    expect((await issueWelcomeCode('ada@example.com', opts)).status).toBe('issued')
  })

  it('a double tap (two requests at once) makes one code', async () => {
    const [a, b] = await Promise.all([issueWelcomeCode('ada@example.com', opts), issueWelcomeCode('ada@example.com', opts)])
    if (a.status === 'refused' || b.status === 'refused') throw new Error('refused')
    expect(a.offer.code).toBe(b.offer.code)
    expect([a.status, b.status].sort()).toEqual(['existing', 'issued'])
    expect(await db.$count(promoCodes)).toBe(1)
  })

  it('tries another code when the first one is already taken by a different code', async () => {
    const taken = candidateWelcomeCode('ada@example.com', 0)!
    await db.insert(promoCodes).values({ code: taken, discountType: 'fixed', discountValue: 500 })
    const r = await issueWelcomeCode('ada@example.com', opts)
    expect(r.status).toBe('issued')
    if (r.status === 'refused') throw new Error('refused')
    expect(r.offer.code).not.toBe(taken)
    expect(r.offer.code).toMatch(WELCOME_CODE_PATTERN)
  })

  it('still issues codes without a secret (random, not derived)', async () => {
    vi.stubEnv('BETTER_AUTH_SECRET', '')
    vi.stubEnv('NEWSLETTER_SECRET', '')
    expect(candidateWelcomeCode('ada@example.com', 0)).toBeNull()
    expect((await issueWelcomeCode('ada@example.com', opts)).status).toBe('issued')
  })
})

describe('code format', () => {
  it('never uses characters that are easy to misread', () => {
    for (let i = 0; i < 300; i++) {
      const code = randomWelcomeCode()
      expect(code).toMatch(WELCOME_CODE_PATTERN)
      expect(code.slice('TWINKLE-'.length)).not.toMatch(/[01OIL]/)
    }
  })

  it('derives the same first code for the same email and attempt, a different one otherwise', () => {
    expect(candidateWelcomeCode('Ada@example.com', 0)).toBe(candidateWelcomeCode('ada@example.com', 0))
    expect(candidateWelcomeCode('ada@example.com', 1)).not.toBe(candidateWelcomeCode('ada@example.com', 0))
    expect(candidateWelcomeCode('bola@example.com', 0)).not.toBe(candidateWelcomeCode('ada@example.com', 0))
  })
})
