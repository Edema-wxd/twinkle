import { revalidatePath } from 'next/cache'

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

  if (typeof b.title === 'string') out.title = b.title.trim()
  if (typeof b.slug === 'string') out.slug = b.slug.trim()
  if (typeof b.body === 'string') out.body = b.body
  if (typeof b.excerpt === 'string') out.excerpt = b.excerpt.trim()

  const featuredImage = optionalText(b.featured_image)
  if (featuredImage !== undefined) out.featuredImage = featuredImage
  const tag = optionalText(b.tag)
  if (tag !== undefined) out.tag = tag
  const seoTitle = optionalText(b.seo_title)
  if (seoTitle !== undefined) out.seoTitle = seoTitle
  const seoDescription = optionalText(b.seo_description)
  if (seoDescription !== undefined) out.seoDescription = seoDescription

  if (typeof b.is_featured === 'boolean') out.isFeatured = b.is_featured
  if (Array.isArray(b.featured_product_ids)) {
    out.featuredProductIds = [...new Set(b.featured_product_ids.filter((x): x is string => typeof x === 'string'))].slice(0, 4)
  }
  if (typeof b.published === 'boolean') out.published = b.published

  if (b.published_at === null) out.publishedAt = null
  else if (typeof b.published_at === 'string' && b.published_at) {
    const d = new Date(b.published_at)
    if (!Number.isNaN(d.getTime())) out.publishedAt = d
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
