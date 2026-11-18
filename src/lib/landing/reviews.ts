import { and, avg, count, desc, eq, inArray, isNotNull, ne } from 'drizzle-orm'
import { db, products as productsTable, reviews as reviewsTable } from '@/db'
import type { LandingConfig } from './config'

/**
 * Reviews on the ad landing page. Only real customer reviews: the carousel shows
 * reviews with a photo AND written permission to show it; the rating line uses
 * every review. Each query fails soft on its own: the photo columns may not exist
 * in production until drizzle-kit push has run, and then only the carousel hides.
 */

export type LandingReview = {
  id: string
  /** First name only: permission covers first name and photo */
  firstName: string
  city: string | null
  body: string
  rating: number
  photoUrl: string
  productName: string
  productSlug: string
  productActive: boolean
}

export type RatingTotals = { average: number; count: number }

export const MAX_PHOTO_REVIEWS = 6

/** Site paths and https URLs only (photos are UploadThing URLs) */
const safePhoto = (url: string) => (url.startsWith('/') && !url.startsWith('//')) || url.startsWith('https://')

export async function getPhotoReviews(limit = MAX_PHOTO_REVIEWS): Promise<LandingReview[]> {
  try {
    const rows = await db
      .select({
        id: reviewsTable.id,
        authorName: reviewsTable.authorName,
        city: reviewsTable.city,
        body: reviewsTable.body,
        rating: reviewsTable.rating,
        photoUrl: reviewsTable.photoUrl,
        productName: productsTable.name,
        productSlug: productsTable.slug,
        productActive: productsTable.isActive,
      })
      .from(reviewsTable)
      .innerJoin(productsTable, eq(productsTable.id, reviewsTable.productId))
      .where(and(eq(reviewsTable.photoPermission, true), isNotNull(reviewsTable.photoUrl), ne(reviewsTable.photoUrl, '')))
      .orderBy(desc(reviewsTable.createdAt))
      .limit(limit * 2) // a few spare in case some photo URLs are unusable
    return rows
      .filter((r): r is typeof r & { photoUrl: string } => !!r.photoUrl && safePhoto(r.photoUrl.trim()))
      .slice(0, limit)
      .map((r) => ({
        id: r.id,
        firstName: r.authorName.trim().split(/\s+/)[0] ?? '',
        city: r.city?.trim() || null,
        body: r.body.trim(),
        rating: Math.max(1, Math.min(5, r.rating)),
        photoUrl: r.photoUrl.trim(),
        productName: r.productName,
        productSlug: r.productSlug,
        productActive: r.productActive,
      }))
  } catch (err) {
    console.error('[landing] failed to load photo reviews, hiding the reviews carousel:', err)
    return []
  }
}

/** Average and number of all reviews (only the original columns, so it works before the new ones are pushed) */
export async function getRatingTotals(): Promise<RatingTotals> {
  try {
    const [row] = await db.select({ average: avg(reviewsTable.rating), count: count() }).from(reviewsTable)
    const n = row?.count ?? 0
    return { average: n ? Number(row.average) : 0, count: n }
  } catch (err) {
    console.error('[landing] failed to load the review totals:', err)
    return { average: 0, count: 0 }
  }
}

/** Average and number of reviews per product, for each featured product's JSON-LD */
export async function getProductRatings(productIds: string[]): Promise<Map<string, RatingTotals>> {
  const map = new Map<string, RatingTotals>()
  if (!productIds.length) return map
  try {
    const rows = await db
      .select({ productId: reviewsTable.productId, average: avg(reviewsTable.rating), count: count() })
      .from(reviewsTable)
      .where(inArray(reviewsTable.productId, productIds))
      .groupBy(reviewsTable.productId)
    for (const r of rows) if (r.count > 0) map.set(r.productId, { average: Number(r.average), count: r.count })
  } catch (err) {
    console.error('[landing] failed to load product ratings:', err)
  }
  return map
}

export type LandingReviews = {
  reviews: LandingReview[]
  totals: RatingTotals
  /** Enough photo reviews for the carousel (never an empty or thin state) */
  showCarousel: boolean
  /** Enough reviews overall for "★ 4.8 from N reviews" */
  showRating: boolean
}

export async function getLandingReviews(config: Pick<LandingConfig, 'minReviewsToShowSection' | 'minReviewsToShowRating'>): Promise<LandingReviews> {
  const [reviews, totals] = await Promise.all([getPhotoReviews(), getRatingTotals()])
  const showCarousel = reviews.length >= config.minReviewsToShowSection
  return {
    reviews: showCarousel ? reviews : [],
    totals,
    showCarousel,
    showRating: totals.count > 0 && totals.count >= config.minReviewsToShowRating,
  }
}
