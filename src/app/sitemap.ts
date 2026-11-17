import type { MetadataRoute } from 'next'
import { db } from '@/db'
import { products, blogPosts } from '@/db'
import { eq } from 'drizzle-orm'
import { isLivePost } from '@/lib/blog/live'

// Refresh at least every 10 minutes so scheduled blog posts appear soon after their publish time
export const revalidate = 600

const BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://twinklelocs.com').replace(/\/$/, '')

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [productRows, postRows] = await Promise.all([
    db
      .select({ slug: products.slug, createdAt: products.createdAt })
      .from(products)
      .where(eq(products.isActive, true)),
    db
      .select({ slug: blogPosts.slug, updatedAt: blogPosts.updatedAt })
      .from(blogPosts)
      .where(isLivePost()),
  ])

  // Audited 2026-04-01: all public routes present. /cart, /checkout, and /orders/ are intentionally excluded.
  const staticRoutes: MetadataRoute.Sitemap = [
    // The homepage is the shop (/catalog redirects to it)
    { url: BASE, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/about`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/faq`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/shipping`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/returns`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE}/blog`, changeFrequency: 'weekly', priority: 0.8 },
  ]

  const productRoutes: MetadataRoute.Sitemap = productRows.map((p) => ({
    url: `${BASE}/catalog/${p.slug}`,
    lastModified: p.createdAt,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  const postRoutes: MetadataRoute.Sitemap = postRows.map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: p.updatedAt ?? undefined,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [...staticRoutes, ...productRoutes, ...postRoutes]
}
