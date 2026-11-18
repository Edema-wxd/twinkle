export interface Review {
  id: string
  product_id: string
  author_name: string
  body: string
  rating: number  // 1–5
  created_at: string
  /** Customer's photo of their locs (UploadThing URL) */
  photo_url?: string | null
  /** Shown after the first name, e.g. "Adaeze, Lagos" */
  city?: string | null
  /** The customer gave written permission to show their photo and first name */
  photo_permission?: boolean
}

/** A review the ad landing page may show in its photo carousel: it has a photo and written permission */
export function isLandingPhotoReview(r: Pick<Review, 'photo_url' | 'photo_permission'>): boolean {
  return Boolean(r.photo_url) && r.photo_permission === true
}
