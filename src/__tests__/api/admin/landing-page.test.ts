import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/db', () => import('../../helpers/pgliteDb'))
vi.mock('@/lib/auth/server', () => ({ getAdminSession: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { db, resetDb, faqs, settings } from '../../helpers/pgliteDb'
import { PUT } from '@/app/api/admin/landing-page/route'
import { POST as addDraftFaqs } from '@/app/api/admin/landing-page/faqs/route'
import { getAdminSession } from '@/lib/auth/server'
import { revalidatePath } from 'next/cache'
import { DEFAULT_LANDING_CONFIG, DEFAULT_LANDING_FAQS, LANDING_FAQ_CATEGORY, LANDING_SETTINGS_KEY } from '@/lib/landing/config'
import { getLandingConfig } from '@/lib/landing/config.server'
import { asc, eq } from 'drizzle-orm'

const mockSession = vi.mocked(getAdminSession)

function put(body: unknown) {
  return PUT(
    new NextRequest('http://localhost/api/admin/landing-page', {
      method: 'PUT',
      body: typeof body === 'string' ? body : JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

beforeEach(async () => {
  await resetDb()
  vi.clearAllMocks()
  mockSession.mockResolvedValue({ user: { id: 'admin-1' } } as never)
})

describe('PUT /api/admin/landing-page', () => {
  it('returns 401 without an admin session and saves nothing', async () => {
    mockSession.mockResolvedValue(null)
    const res = await put({ ...DEFAULT_LANDING_CONFIG, announcement: 'Hacked' })
    expect(res.status).toBe(401)
    expect(await db.select().from(settings)).toEqual([])
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('rejects a body that is not JSON or not an object, so a bad request cannot wipe the page', async () => {
    expect((await put('{nope')).status).toBe(400)
    expect((await put([1, 2])).status).toBe(400)
    expect((await put('"text"')).status).toBe(400)
    expect(await db.select().from(settings)).toEqual([])
  })

  it('saves the cleaned config, returns it and refreshes every version of the page', async () => {
    const res = await put({
      ...DEFAULT_LANDING_CONFIG,
      announcement: 'Free Lagos delivery this week',
      hero: {
        ...DEFAULT_LANDING_CONFIG.hero,
        headline: 'New headline',
        image: { url: 'https://ta1u3ge9om.ufs.sh/f/hero', alt: 'Gold Twinkles on locs' },
        videoUrl: 'javascript:alert(1)',
        variants: [
          { key: 'gold-video', label: 'Gold video', image: null, videoUrl: null, headline: 'Gold all day', subhead: '' },
          { key: 'Not A Key!', label: 'Bad', image: null, videoUrl: null, headline: '', subhead: '' },
        ],
      },
      welcomeOffer: { enabled: true, percent: 500, expiryHours: 6, minOrder: 100_000, popup: true },
    })
    expect(res.status).toBe(200)
    const { config } = await res.json()

    expect(config.announcement).toBe('Free Lagos delivery this week')
    expect(config.hero.headline).toBe('New headline')
    expect(config.hero.image).toEqual({ url: 'https://ta1u3ge9om.ufs.sh/f/hero', alt: 'Gold Twinkles on locs' })
    // Cleaned by parseLandingConfig: unsafe link dropped, bad key dropped, out-of-range percent back to the default
    expect(config.hero.videoUrl).toBeNull()
    expect(config.hero.variants.map((v: { key: string }) => v.key)).toEqual(['gold-video'])
    expect(config.welcomeOffer).toEqual({ enabled: true, percent: 10, expiryHours: 6, minOrder: 100_000, popup: true })

    // Stored, so the live page reads the same thing
    expect(await getLandingConfig()).toEqual(config)
    const [row] = await db.select().from(settings).where(eq(settings.key, LANDING_SETTINGS_KEY))
    expect(JSON.parse(row.value)).toEqual(config)

    expect(revalidatePath).toHaveBeenCalledWith('/shop-twinkles', 'layout')
  })

  it('overwrites the previous save', async () => {
    await put({ ...DEFAULT_LANDING_CONFIG, returnsLine: 'First' })
    await put({ ...DEFAULT_LANDING_CONFIG, returnsLine: 'Second' })
    expect((await getLandingConfig()).returnsLine).toBe('Second')
    expect(await db.select().from(settings)).toHaveLength(1)
  })
})

describe('POST /api/admin/landing-page/faqs (add the draft FAQs)', () => {
  it('returns 401 without an admin session', async () => {
    mockSession.mockResolvedValue(null)
    expect((await addDraftFaqs()).status).toBe(401)
    expect(await db.select().from(faqs)).toEqual([])
  })

  it('adds the draft questions in order under the landing page category', async () => {
    const res = await addDraftFaqs()
    expect(res.status).toBe(201)

    const rows = await db.select().from(faqs).orderBy(asc(faqs.displayOrder))
    expect(rows.map((r) => r.question)).toEqual(DEFAULT_LANDING_FAQS.map((f) => f.question))
    expect(rows.map((r) => r.answer)).toEqual(DEFAULT_LANDING_FAQS.map((f) => f.answer))
    expect(rows.every((r) => r.category === LANDING_FAQ_CATEGORY && !r.isFeatured)).toBe(true)
    expect(rows.map((r) => r.displayOrder)).toEqual(DEFAULT_LANDING_FAQS.map((_, i) => i))

    expect(revalidatePath).toHaveBeenCalledWith('/faq')
    expect(revalidatePath).toHaveBeenCalledWith('/shop-twinkles', 'layout')
  })

  it('refuses once the landing page has any FAQ, so they are never added twice', async () => {
    await db.insert(faqs).values({ category: LANDING_FAQ_CATEGORY, question: 'Own question?', answer: 'Yes.', displayOrder: 0 })
    const res = await addDraftFaqs()
    expect(res.status).toBe(409)
    expect(await db.select().from(faqs)).toHaveLength(1)
  })

  it('ignores FAQs in other categories', async () => {
    await db.insert(faqs).values({ category: 'Shipping', question: 'How long?', answer: '3 days.', displayOrder: 0 })
    expect((await addDraftFaqs()).status).toBe(201)
    expect(await db.select().from(faqs)).toHaveLength(DEFAULT_LANDING_FAQS.length + 1)
  })
})
