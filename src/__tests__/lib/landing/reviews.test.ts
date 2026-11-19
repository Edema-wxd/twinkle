import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/db', () => import('../../helpers/pgliteDb'))

import { db, pg, resetDb, products, reviews } from '../../helpers/pgliteDb'
import { getLandingReviews, getProductRatings, MAX_PHOTO_REVIEWS } from '@/lib/landing/reviews'

const thresholds = { minReviewsToShowSection: 3, minReviewsToShowRating: 10 }

let productId = ''
let seq = 0
async function review(r: { rating?: number; photoUrl?: string | null; photoPermission?: boolean; authorName?: string; city?: string | null; product?: string }) {
  await db.insert(reviews).values({
    productId: r.product ?? productId,
    authorName: r.authorName ?? `Ada Obi ${seq}`,
    body: `Review ${seq}`,
    rating: r.rating ?? 5,
    photoUrl: r.photoUrl === undefined ? `https://ta1u3ge9om.ufs.sh/f/photo-${seq}` : r.photoUrl,
    photoPermission: r.photoPermission ?? true,
    city: r.city === undefined ? 'Lagos' : r.city,
    createdAt: new Date(Date.UTC(2026, 5, 1, 0, ++seq)),
  })
}

beforeEach(async () => {
  await resetDb()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  seq = 0
  const [p] = await db
    .insert(products)
    .values({ slug: 'gold-twinkles', name: 'Gold Twinkles ✨', material: 'Gold', priceMin: 1, priceMax: 1, variants: [] })
    .returning({ id: products.id })
  productId = p.id
})

describe('getLandingReviews', () => {
  it('shows only reviews with a photo AND permission, newest first, first name only, with the product', async () => {
    await review({ authorName: 'Adaeze Okafor', city: 'Lagos' })
    await review({ photoPermission: false }) // photo but no permission
    await review({ photoUrl: null }) // permission but no photo
    await review({ photoUrl: '' })
    await review({ photoUrl: 'javascript:alert(1)' }) // never rendered
    await review({ authorName: 'Kemi', city: null })
    await review({ authorName: '  Ngozi  Eze ', city: ' Abuja ' })

    const data = await getLandingReviews(thresholds)
    expect(data.showCarousel).toBe(true)
    expect(data.reviews.map((r) => `${r.firstName}|${r.city}`)).toEqual(['Ngozi|Abuja', 'Kemi|null', 'Adaeze|Lagos'])
    expect(data.reviews[0]).toMatchObject({ productName: 'Gold Twinkles ✨', productSlug: 'gold-twinkles', productActive: true, rating: 5 })
  })

  it(`shows at most ${MAX_PHOTO_REVIEWS}`, async () => {
    for (let i = 0; i < 8; i++) await review({})
    const data = await getLandingReviews(thresholds)
    expect(data.reviews).toHaveLength(MAX_PHOTO_REVIEWS)
    expect(data.reviews[0].body).toBe('Review 7')
  })

  it('hides the carousel below minReviewsToShowSection (no thin or empty state)', async () => {
    await review({})
    await review({})
    await review({ photoPermission: false })
    const data = await getLandingReviews(thresholds)
    expect(data.showCarousel).toBe(false)
    expect(data.reviews).toEqual([])
  })

  it('shows the rating line only from minReviewsToShowRating reviews, counting every review', async () => {
    for (let i = 0; i < 9; i++) await review({ rating: i < 3 ? 4 : 5, photoUrl: null })
    let data = await getLandingReviews(thresholds)
    expect(data.totals).toEqual({ average: 14 / 3, count: 9 })
    expect(data.showRating).toBe(false)

    await review({ rating: 5, photoUrl: null })
    data = await getLandingReviews(thresholds)
    expect(data.totals.count).toBe(10)
    expect(data.showRating).toBe(true)
  })

  it('without the photo columns (schema not pushed yet) just hides the carousel; the rating still works', async () => {
    for (let i = 0; i < 4; i++) await review({})
    await pg.exec('ALTER TABLE reviews DROP COLUMN photo_url')
    try {
      const data = await getLandingReviews({ minReviewsToShowSection: 3, minReviewsToShowRating: 1 })
      expect(data.showCarousel).toBe(false)
      expect(data.totals.count).toBe(4)
      expect(data.showRating).toBe(true)
    } finally {
      await pg.exec('ALTER TABLE reviews ADD COLUMN photo_url text')
    }
  })
})

describe('getProductRatings', () => {
  it('averages per product, only for products with reviews', async () => {
    await review({ rating: 4 })
    await review({ rating: 5 })
    const map = await getProductRatings([productId, '22222222-2222-2222-2222-222222222222'])
    expect(map.get(productId)).toEqual({ average: 4.5, count: 2 })
    expect(map.has('22222222-2222-2222-2222-222222222222')).toBe(false)
  })
})
