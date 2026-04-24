import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

const BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://twinklelocs.com').replace(/\/$/, '')

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()

  const [{ data: products }, { data: posts }] = await Promise.all([
    supabase
      .from('products')
      .select('slug, created_at')
      .eq('is_active', true),
    supabase
      .from('blog_posts')
      .select('slug, updated_at')
      .eq('published', true),
  ])

  // Audited 2026-04-01: all public routes present. /cart, /checkout, and /orders/ are intentionally excluded.
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/catalog`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/about`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/faq`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/shipping`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/blog`, changeFrequency: 'weekly', priority: 0.8 },
  ]

  const productRoutes: MetadataRoute.Sitemap = (products ?? []).map((p) => ({
    url: `${BASE}/catalog/${p.slug}`,
    lastModified: p.created_at,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  const postRoutes: MetadataRoute.Sitemap = (posts ?? []).map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: p.updated_at ?? undefined,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [...staticRoutes, ...productRoutes, ...postRoutes]
}
