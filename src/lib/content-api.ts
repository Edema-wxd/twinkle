import { revalidatePath } from 'next/cache'
import { sanitizeArticleHtml } from '@/lib/content'

/**
 * Validation + cache helpers shared by the admin blog/FAQ API routes.
 * Pages are statically cached, so every write must revalidate the public
 * surfaces that show the content (blog index, post, home teasers, FAQ, sitemap).
 */

export type BlogInput = {
  title?: string
  slug?: string
  body?: string
  excerpt?: string
  featuredImage?: string | null
  tag?: string | null
  seoTitle?: string | null
  seoDescription?: string | null
  isFeatured?: boolean
  featuredProductIds?: string[]
  published?: boolean
  publishedAt?: Date | null
}

const optionalText = (v: unknown): string | null | undefined => {
  if (v === undefined) return undefined
  if (v === null) return null
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  return t === '' ? null : t
}

/** Pull known blog fields out of a JSON body (snake_case wire format). Unknown/invalid fields are ignored. */
export function parseBlogInput(raw: unknown): BlogInput {
  const b = (raw ?? {}) as Record<string, unknown>
  const out: BlogInput = {}

  if (typeof b.title === 'string') out.title = b.title.trim().slice(0, 200)
  if (typeof b.slug === 'string') out.slug = b.slug.trim().slice(0, 120)
  // Stored sanitised, so nothing unsafe can reach the admin preview or the site
  if (typeof b.body === 'string') out.body = sanitizeArticleHtml(b.body.slice(0, 500_000))
  if (typeof b.excerpt === 'string') out.excerpt = b.excerpt.trim().slice(0, 500)

  const featuredImage = optionalText(b.featured_image)
  // Only https URLs (UploadThing) — anything else would break next/image in production
  if (featuredImage !== undefined) out.featuredImage = featuredImage && /^https:\/\//.test(featuredImage) ? featuredImage : null
  const tag = optionalText(b.tag)
  if (tag !== undefined) out.tag = tag ? tag.slice(0, 60) : tag
  const seoTitle = optionalText(b.seo_title)
  if (seoTitle !== undefined) out.seoTitle = seoTitle ? seoTitle.slice(0, 200) : seoTitle
  const seoDescription = optionalText(b.seo_description)
  if (seoDescription !== undefined) out.seoDescription = seoDescription ? seoDescription.slice(0, 500) : seoDescription

  if (typeof b.is_featured === 'boolean') out.isFeatured = b.is_featured
  if (Array.isArray(b.featured_product_ids)) {
    out.featuredProductIds = [...new Set(b.featured_product_ids.filter((x): x is string => typeof x === 'string' && isUuid(x)))].slice(0, 4)
  }
  if (typeof b.published === 'boolean') out.published = b.published

  if (b.published_at === null) out.publishedAt = null
  else if (typeof b.published_at === 'string' && b.published_at) {
    const d = new Date(b.published_at)
    // No scheduling yet: a future date would show "published tomorrow" today, so clamp to now
    if (!Number.isNaN(d.getTime())) out.publishedAt = d.getTime() > Date.now() ? new Date() : d
  }

  return out
}

export function revalidateBlog(...slugs: (string | null | undefined)[]) {
  revalidatePath('/blog')
  revalidatePath('/')
  revalidatePath('/sitemap.xml')
  for (const slug of new Set(slugs)) {
    if (slug) revalidatePath(`/blog/${slug}`)
  }
}

export function revalidateFaqs() {
  revalidatePath('/faq')
  revalidatePath('/')
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** Postgres throws on a malformed uuid; treat those as "not found" instead of a 500. */
export function isUuid(id: string): boolean {
  return UUID_RE.test(id)
}

/** All UploadThing image URLs used inside an article body. */
export function bodyImageUrls(html: string | null | undefined): string[] {
  if (!html) return []
  return [...new Set(Array.from(html.matchAll(/<img\b[^>]*\bsrc="(https:\/\/[^"]+\.ufs\.sh\/[^"]+)"/gi)).map((m) => m[1]))]
}
