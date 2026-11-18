import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/db', () => import('../../helpers/pgliteDb'))
vi.mock('@/lib/auth/server', () => ({ getAdminSession: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { db, resetDb, products, reviews } from '../../helpers/pgliteDb'
import { POST } from '@/app/api/admin/reviews/route'
import { PUT, DELETE } from '@/app/api/admin/reviews/[id]/route'
import { getAdminSession } from '@/lib/auth/server'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'

const mockSession = vi.mocked(getAdminSession)
const PHOTO = 'https://ta1u3ge9om.ufs.sh/f/locs-photo'

let productId = ''

function req(method: string, body?: unknown) {
  return new NextRequest('http://localhost/api/admin/reviews', {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
  })
}

const params = (id: string) => ({ params: Promise.resolve({ id }) })

function newReview(extra: Record<string, unknown> = {}) {
  return { product_id: productId, author_name: 'Adaeze', body: 'They shine all day.', rating: 5, ...extra }
}

async function savedReview(id: string) {
  const [row] = await db.select().from(reviews).where(eq(reviews.id, id))
  return row
}

beforeEach(async () => {
  await resetDb()
  vi.clearAllMocks()
  mockSession.mockResolvedValue({ user: { id: 'admin-1' } } as never)
  const [p] = await db
    .insert(products)
    .values({ name: 'Gold Twinkles', slug: 'gold-twinkles', material: 'Gold', priceMin: 15000, priceMax: 60000 })
    .returning({ id: products.id })
  productId = p.id
})

describe('auth', () => {
  it('POST, PUT and DELETE return 401 without an admin session', async () => {
    mockSession.mockResolvedValue(null)
    expect((await POST(req('POST', newReview()))).status).toBe(401)
    expect((await PUT(req('PUT', { author_name: 'A', reviewBody: 'B', rating: 5 }), params(productId))).status).toBe(401)
    expect((await DELETE(req('DELETE'), params(productId))).status).toBe(401)
    expect(await db.select().from(reviews)).toEqual([])
  })
})

describe('POST /api/admin/reviews: photo review fields', () => {
  it('saves the photo, city and written permission', async () => {
    const res = await POST(req('POST', newReview({ photo_url: PHOTO, city: '  Lagos ', photo_permission: true })))
    expect(res.status).toBe(201)
    const created = await res.json()
    expect(await savedReview(created.id)).toMatchObject({ photoUrl: PHOTO, city: 'Lagos', photoPermission: true })
    expect(revalidatePath).toHaveBeenCalledWith('/shop-twinkles', 'layout')
  })

  it('defaults to no photo, no city and no permission', async () => {
    const created = await (await POST(req('POST', newReview()))).json()
    expect(await savedReview(created.id)).toMatchObject({ photoUrl: null, city: null, photoPermission: false })
  })

  it('treats an empty photo or city as none', async () => {
    const created = await (await POST(req('POST', newReview({ photo_url: '', city: '   ' })))).json()
    expect(await savedReview(created.id)).toMatchObject({ photoUrl: null, city: null })
  })

  it.each([
    ['http (not https)', { photo_url: 'http://ta1u3ge9om.ufs.sh/f/x' }],
    ['a javascript: link', { photo_url: 'javascript:alert(1)' }],
    ['a photo hosted elsewhere', { photo_url: 'https://example.com/locs.jpg' }],
    ['a look-alike host', { photo_url: 'https://ufs.sh.evil.example/f/x' }],
    ['a photo URL that is not text', { photo_url: 42 }],
    ['a city that is too long', { city: 'x'.repeat(61) }],
    ['a city that is not text', { city: ['Lagos'] }],
    ['permission that is not true/false', { photo_permission: 'yes' }],
  ])('returns 400 for %s', async (_label, extra) => {
    const res = await POST(req('POST', newReview(extra)))
    expect(res.status).toBe(400)
    expect(await db.select().from(reviews)).toEqual([])
  })

  it('accepts utfs.io photo links (older UploadThing address)', async () => {
    expect((await POST(req('POST', newReview({ photo_url: 'https://utfs.io/f/abc' })))).status).toBe(201)
  })
})

describe('PUT /api/admin/reviews/[id]: photo review fields', () => {
  let id = ''
  beforeEach(async () => {
    id = (await (await POST(req('POST', newReview({ photo_url: PHOTO, city: 'Abuja', photo_permission: true })))).json()).id
    vi.mocked(revalidatePath).mockClear()
  })

  const edit = (extra: Record<string, unknown> = {}) => ({ author_name: 'Adaeze O.', reviewBody: 'Still shining.', rating: 4, ...extra })

  it('keeps the photo fields when an update leaves them out', async () => {
    expect((await PUT(req('PUT', edit()), params(id))).status).toBe(200)
    expect(await savedReview(id)).toMatchObject({ authorName: 'Adaeze O.', rating: 4, photoUrl: PHOTO, city: 'Abuja', photoPermission: true })
    expect(revalidatePath).toHaveBeenCalledWith('/shop-twinkles', 'layout')
  })

  it('changes and clears them', async () => {
    const res = await PUT(req('PUT', edit({ photo_url: null, city: 'Port Harcourt', photo_permission: false })), params(id))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ photoUrl: null, city: 'Port Harcourt', photoPermission: false })
  })

  it('returns 400 for an invalid photo and leaves the review as it was', async () => {
    const res = await PUT(req('PUT', edit({ photo_url: 'https://example.com/x.jpg' })), params(id))
    expect(res.status).toBe(400)
    expect(await savedReview(id)).toMatchObject({ authorName: 'Adaeze', photoUrl: PHOTO })
  })

  it('returns 404 for an unknown or malformed id', async () => {
    expect((await PUT(req('PUT', edit()), params('00000000-0000-0000-0000-000000000000'))).status).toBe(404)
    expect((await PUT(req('PUT', edit()), params('not-a-uuid'))).status).toBe(404)
  })

  it('DELETE removes the review and refreshes the landing page', async () => {
    expect((await DELETE(req('DELETE'), params(id))).status).toBe(204)
    expect(await db.select().from(reviews)).toEqual([])
    expect(revalidatePath).toHaveBeenCalledWith('/shop-twinkles', 'layout')
  })
})
