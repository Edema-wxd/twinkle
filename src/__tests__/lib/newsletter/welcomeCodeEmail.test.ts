import { describe, it, expect, vi } from 'vitest'

// Only the pure wording helpers are tested here (sending is covered in the subscribe route tests)
vi.mock('@/db', () => ({ db: {} }))

import { describeExpiry, offerTerms, welcomeCodeBlockHtml } from '@/lib/newsletter/welcomeCodeEmail'
import { formatNgn, meetsMinOrder, minOrderMessage, minOrderOf } from '@/lib/promo/minOrder'

const HOUR = 60 * 60 * 1000
// 3pm UTC = 4pm in Lagos
const now = new Date('2026-11-18T15:00:00Z')
const after = (ms: number) => new Date(now.getTime() + ms)
const offer = { code: 'TWINKLE-7KQ2MX', percent: 10, expiresAt: after(6 * HOUR).toISOString(), minOrder: 100_000 }

describe('describeExpiry (Lagos time)', () => {
  it('says how long is left and the time it ends', () => {
    expect(describeExpiry(after(6 * HOUR), now)).toEqual({ within: 'the next 6 hours', until: '10:00pm' })
    expect(describeExpiry(after(6 * HOUR + 30 * 60_000), now).until).toBe('10:30pm')
  })

  it('adds "tomorrow" or the date when it ends on another day', () => {
    const evening = new Date('2026-11-18T20:15:00Z') // 9:15pm Lagos
    expect(describeExpiry(new Date(evening.getTime() + 6 * HOUR), evening)).toEqual({ within: 'the next 6 hours', until: '3:15am tomorrow' })
    expect(describeExpiry(after(72 * HOUR), now)).toEqual({ within: 'the next 3 days', until: '4:00pm on Sat 21 November' })
  })

  it('counts minutes near the end, and an hour as "the next hour"', () => {
    expect(describeExpiry(after(45 * 60_000), now).within).toBe('the next 45 minutes')
    expect(describeExpiry(after(HOUR), now).within).toBe('the next hour')
    expect(describeExpiry(after(30_000), now).within).toBe('the next minute')
  })
})

describe('welcome code email copy', () => {
  it('states the percent, one use, the time window and the minimum', () => {
    expect(offerTerms(offer, now)).toBe(
      'It takes 10% off and works once at checkout, for the next 6 hours (until 10:00pm), on orders of ₦100,000 or more before delivery.',
    )
  })

  it('leaves the minimum out when the code has none', () => {
    expect(offerTerms({ ...offer, minOrder: 0 }, now)).toBe('It takes 10% off and works once at checkout, for the next 6 hours (until 10:00pm).')
  })

  it('shows the code in a box', () => {
    const html = welcomeCodeBlockHtml(offer, now)
    expect(html).toContain('>TWINKLE-7KQ2MX</p>')
    expect(html).toContain('10% off orders of ₦100,000+ · one use · until 10:00pm')
  })
})

describe('minimum order rule', () => {
  it('compares the items subtotal with the code’s minimum; null or 0 means none', () => {
    expect(minOrderOf({ minOrder: null })).toBe(0)
    expect(minOrderOf({ minOrder: 0 })).toBe(0)
    expect(meetsMinOrder({ minOrder: null }, 0)).toBe(true)
    expect(meetsMinOrder({ minOrder: 100_000 }, 99_999)).toBe(false)
    expect(meetsMinOrder({ minOrder: 100_000 }, 100_000)).toBe(true)
  })

  it('explains the minimum in naira', () => {
    expect(formatNgn(100_000)).toBe('₦100,000')
    expect(minOrderMessage(100_000)).toBe('This code works on orders of ₦100,000 or more (before delivery).')
  })
})
