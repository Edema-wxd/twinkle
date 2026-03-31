# Phase 9: SEO - Research

**Researched:** 2026-03-31
**Domain:** Next.js 15 App Router metadata, JSON-LD, sitemap, robots.txt
**Confidence:** HIGH

---

## Summary

Phase 9 adds SEO infrastructure to an existing Next.js 15 App Router codebase. The app already has a partial metadata setup (static `metadata` exports on several pages) but lacks dynamic metadata on product/blog detail pages, structured data, a sitemap, and a robots.txt. The codebase uses Supabase for products (`is_active = true`) and blog posts (`published = true`), and the middleware already handles uppercase-to-lowercase redirects.

Next.js 15 provides first-class support for all required SEO primitives: `generateMetadata()` for dynamic metadata, `app/sitemap.ts` for the sitemap route, `app/robots.ts` for robots.txt, and a plain `<script>` tag pattern for JSON-LD structured data. No additional SEO libraries are needed.

The `seo_description` field referenced in CONTEXT.md does not exist in the current `products` table — it must be added as a nullable text column via a Supabase migration before the product page `generateMetadata()` function can use it.

**Primary recommendation:** Use Next.js native metadata API throughout. Add `seo_description` column to products table. Inject JSON-LD as plain `<script>` tags in Server Components.

---

## Standard Stack

### Core

| Library/API | Version | Purpose | Why Standard |
|-------------|---------|---------|--------------|
| Next.js `Metadata` type | 15.x | Static and dynamic page metadata | Built-in; zero deps |
| `generateMetadata()` | 15.x | Dynamic metadata for product/blog pages | Official App Router API |
| `MetadataRoute.Sitemap` | 15.x | app/sitemap.ts return type | Official Next.js file convention |
| `MetadataRoute.Robots` | 15.x | app/robots.ts return type | Official Next.js file convention |
| Plain `<script type="application/ld+json">` | n/a | JSON-LD structured data injection | Official Next.js recommendation |

### Supporting (Optional)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `schema-dts` | latest | TypeScript types for JSON-LD schemas | Use if type safety on JSON-LD objects is wanted; not required |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain `<script>` tag | `next-seo` or `next/script` | `next/script` is for executable JS, not structured data. `next-seo` adds a dependency with no benefit over native API. |
| `app/sitemap.ts` | Static `sitemap.xml` file | Static file can't include dynamic products/posts from Supabase. |
| `app/robots.ts` | Static `robots.txt` file | Static file works fine; `robots.ts` is equivalent but lets you use env var for site URL. Either is acceptable. |

**Installation:** No new packages required. `schema-dts` is optional:

```bash
npm install schema-dts
```

---

## Architecture Patterns

### Recommended File Structure

```
src/app/
├── layout.tsx                    # Root: add metadataBase + title template + global OG image
├── sitemap.ts                    # Dynamic sitemap fetching from Supabase
├── robots.ts                     # robots.txt generation
├── page.tsx                      # Homepage: update static metadata export
├── about/page.tsx                # Update static metadata (title format)
├── faq/page.tsx                  # Update metadata + add FAQPage JSON-LD
├── shipping/page.tsx             # Update static metadata (title format)
├── catalog/page.tsx              # Update static metadata (title format)
├── catalog/[slug]/page.tsx       # Add generateMetadata() + Product JSON-LD + BreadcrumbList JSON-LD
├── blog/page.tsx                 # Update static metadata (title format)
└── blog/[slug]/page.tsx          # Add generateMetadata() + BlogPosting JSON-LD
public/
└── og-image.jpg                  # 1200×630 global brand OG image (developer provides)
```

### Pattern 1: Root Layout with metadataBase and Title Template

Set `metadataBase` in the root layout once. All relative OG image paths in child pages resolve against it.

```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/generate-metadata
// app/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://twinklelocs.com'
  ),
  title: {
    default: 'Twinkle Locs | Nigerian Loc Beads & Accessories',
    template: '%s | Twinkle Locs',
  },
  description: 'Premium loc bead accessories for your loc journey',
  openGraph: {
    siteName: 'Twinkle Locs',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
  },
}
```

**Key behaviour:** `title.template` applies to child pages. The homepage uses `title.default` (absolute title). Child pages set `title: 'Page Name'` which renders as `'Page Name | Twinkle Locs'`.

### Pattern 2: Static Metadata Export (for static pages)

```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/generate-metadata
// app/faq/page.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FAQs',  // renders: "FAQs | Twinkle Locs"
  description: 'Answers to common questions about our loc beads, shipping, care, and orders.',
}
```

### Pattern 3: Dynamic generateMetadata (product pages)

params is a Promise in Next.js 15 — must be awaited.

```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/generate-metadata
// app/catalog/[slug]/page.tsx
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const result = await supabase
    .from('products')
    .select('name, description, seo_description, image, images')
    .eq('slug', slug)
    .single()

  if (result.error || !result.data) return {}

  const product = result.data
  const description = product.seo_description
    ?? product.description.slice(0, 155)
  const ogImage = product.images?.[0] ?? product.image

  return {
    title: product.name,
    description,
    openGraph: {
      title: product.name,
      description,
      images: ogImage ? [{ url: ogImage }] : undefined,
      type: 'website',
    },
  }
}
```

**Key behaviour:** The Supabase fetch in `generateMetadata` is automatically memoized — it does NOT execute a second database query when the page component also fetches the same product. This is guaranteed by Next.js 15 fetch memoization for the same URL/query in the same render pass.

### Pattern 4: JSON-LD Script Tag in Server Component

```typescript
// Source: https://nextjs.org/docs/app/guides/json-ld
// app/catalog/[slug]/page.tsx — inside the default export
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: product.name,
  description: product.description,
  image: product.images?.[0] ?? product.image,
  brand: {
    '@type': 'Brand',
    name: 'Twinkle Locs',
  },
  offers: {
    '@type': 'Offer',
    priceCurrency: 'NGN',
    price: product.price_min,
    availability: 'https://schema.org/InStock',
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/catalog/${product.slug}`,
  },
  // aggregateRating included when reviews exist (see pitfalls)
}

return (
  <main>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
      }}
    />
    {/* rest of page */}
  </main>
)
```

**XSS note:** The `.replace(/</g, '\\u003c')` sanitisation is required per official Next.js docs to prevent XSS injection through untrusted product names/descriptions in the JSON-LD payload.

### Pattern 5: Sitemap with Supabase data fetching

```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
// app/sitemap.ts
import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://twinklelocs.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()

  const [{ data: products }, { data: posts }] = await Promise.all([
    supabase.from('products').select('slug, created_at').eq('is_active', true),
    supabase.from('blog_posts').select('slug, updated_at').eq('published', true),
  ])

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
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  const postRoutes: MetadataRoute.Sitemap = (posts ?? []).map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: p.updated_at,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  return [...staticRoutes, ...productRoutes, ...postRoutes]
}
```

### Pattern 6: Robots.ts

```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
// app/robots.ts
import type { MetadataRoute } from 'next'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://twinklelocs.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/cart', '/orders/', '/api/'],
    },
    sitemap: `${BASE}/sitemap.xml`,
  }
}
```

### Pattern 7: BreadcrumbList JSON-LD

```typescript
const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
    { '@type': 'ListItem', position: 2, name: 'Catalog', item: `${BASE}/catalog` },
    { '@type': 'ListItem', position: 3, name: product.name, item: `${BASE}/catalog/${product.slug}` },
  ],
}
```

### Pattern 8: FAQPage JSON-LD

```typescript
// app/faq/page.tsx — FAQs are fetched from Supabase already
const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
}
```

### Pattern 9: BlogPosting JSON-LD

```typescript
// app/blog/[slug]/page.tsx
const blogJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: post.title,
  description: post.excerpt,
  image: post.featured_image ?? undefined,
  datePublished: post.published_at,
  dateModified: post.updated_at,
  author: {
    '@type': 'Organization',
    name: 'Twinkle Locs',
  },
  url: `${BASE}/blog/${post.slug}`,
}
```

### Anti-Patterns to Avoid

- **Using `next/script` for JSON-LD:** `next/script` is designed for executable JavaScript (analytics, chat widgets, etc.). JSON-LD is data, not code. Use native `<script>` tag directly.
- **Setting metadata in Client Components:** `export const metadata` and `generateMetadata` only work in Server Components. If a page component is `'use client'`, metadata must be exported from a parent layout or a separate server file.
- **Not awaiting `params` in generateMetadata:** In Next.js 15, `params` is `Promise<{ slug: string }>`. Forgetting `await params` is a common error that returns `undefined`.
- **Duplicating Supabase queries between generateMetadata and page component:** Use the same Supabase query shape — Next.js 15 memoizes fetch/Supabase calls with the same parameters within the same render cycle, preventing double requests.
- **openGraph object partial override:** If a parent layout sets `openGraph`, a child page that sets any `openGraph` field overwrites the ENTIRE parent openGraph object (shallow merge). Always include all needed OG fields (title, description, images) in each dynamic page's metadata.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| robots.txt generation | Manual string with conditionals | `app/robots.ts` with `MetadataRoute.Robots` | Typed, cached by default, auto-served at /robots.txt |
| sitemap XML generation | Manual XML template string | `app/sitemap.ts` with `MetadataRoute.Sitemap` | Typed, handles XML escaping, served at /sitemap.xml |
| `<head>` tag injection | Custom head component with useState | `metadata` export or `generateMetadata()` | Next.js handles deduplication, streaming, and ordering |
| Canonical URL redirects | Custom redirect middleware for uppercase | Already done in middleware.ts (Phase 1) | Already implemented — don't reimplement |

**Key insight:** The `<head>` in App Router is fully managed by Next.js. Never manually inject title/description/og tags via a custom component — they will conflict with the metadata API.

---

## Common Pitfalls

### Pitfall 1: `seo_description` field missing from products table

**What goes wrong:** `generateMetadata()` on product pages reads `product.seo_description` but this column does not exist in the current database schema (`src/types/supabase.ts` has no `seo_description` field).

**Why it happens:** The CONTEXT.md decision references this field as a feature to be built, but it has not been added yet.

**How to avoid:** The phase must include a Supabase migration step that adds `seo_description TEXT NULL` to the `products` table before any product metadata code uses it. The `Database` type in `src/types/supabase.ts` must also be updated to reflect the new column.

**Warning signs:** TypeScript error `Property 'seo_description' does not exist on type '...'` when writing `generateMetadata` for product pages.

### Pitfall 2: OG image URLs must be absolute

**What goes wrong:** `openGraph.images` accepts relative paths when `metadataBase` is set in the root layout, but if `metadataBase` is not set, relative paths silently fail — the og:image tag is omitted.

**Why it happens:** The root `layout.tsx` currently has no `metadataBase`. Without it, any relative image path in a child page's `openGraph.images` array is dropped at build time.

**How to avoid:** Set `metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://twinklelocs.com')` in `app/layout.tsx` as the first task of this phase. All relative OG paths then resolve correctly.

**Warning signs:** og:image meta tag missing from page source when `metadataBase` is absent.

### Pitfall 3: NEXT_PUBLIC_SITE_URL is not set in .env.local

**What goes wrong:** `process.env.NEXT_PUBLIC_SITE_URL` is referenced in `blog/[slug]/page.tsx` and will be needed in `sitemap.ts` and `robots.ts`. It is not currently set in `.env.local`.

**Why it happens:** The env var was added to code but never added to the env file.

**How to avoid:** Add `NEXT_PUBLIC_SITE_URL=https://twinklelocs.com` to `.env.local`. The fallback `?? 'https://twinklelocs.com'` handles production, but for local development the env var should be explicit.

### Pitfall 4: Shallow merge of openGraph in child pages overwrites parent

**What goes wrong:** Root layout sets `openGraph.images: [{ url: '/og-image.jpg' }]`. A product page sets `openGraph: { title: product.name, description: '...' }` without re-specifying images. Result: the product page has NO og:image tag.

**Why it happens:** Next.js metadata merging is shallow — an `openGraph` object in a child completely replaces (not extends) the parent's `openGraph` object.

**How to avoid:** Every `generateMetadata()` that sets any `openGraph` field must include the full set of desired OG fields. For product pages that have a specific image, include the image. For blog posts, include the featured image.

### Pitfall 5: AggregateRating in Product schema requires actual reviews

**What goes wrong:** Adding `aggregateRating` to a Product JSON-LD when the product has zero reviews. Google will flag this as invalid in Rich Results Test.

**Why it happens:** The schema is always rendered regardless of whether reviews exist.

**How to avoid:** Conditionally include `aggregateRating` only when reviews are present and `ratingCount > 0`.

```typescript
// Conditionally add aggregateRating
...(reviews.length > 0 && {
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1),
    reviewCount: reviews.length,
  },
}),
```

### Pitfall 6: Supabase client in sitemap.ts uses cookies() — opts out of caching

**What goes wrong:** `createClient()` calls `cookies()` from `next/headers`. Any Server Function that calls a Request-time API is automatically dynamic (not cached). The sitemap fetches on every request.

**Why it happens:** The existing `createClient()` pattern wraps `cookies()` unconditionally.

**How to avoid:** For the sitemap, this is acceptable — Vercel caches the sitemap response at the CDN level by default. Alternatively, create a separate Supabase client using the service role key without `cookies()` for routes that don't need session context. For this project's scale, dynamic is fine.

### Pitfall 7: metadata export and generateMetadata cannot coexist on same route

**What goes wrong:** Trying to export both `export const metadata` and `export async function generateMetadata` from the same `page.tsx` file causes a build error.

**Why it happens:** Next.js only allows one metadata export type per route segment.

**How to avoid:** Use `generateMetadata()` on dynamic pages (product, blog post). Use `export const metadata` on static pages (homepage, /catalog, /about, /faq, /shipping).

---

## Code Examples

### Complete generateMetadata for product page (with AggregateRating guard)

```typescript
// Source: Next.js official docs + schema.org Product spec
// app/catalog/[slug]/page.tsx

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const result = await supabase
    .from('products')
    .select('name, description, seo_description, image, images, slug')
    .eq('slug', slug)
    .single()

  if (result.error || !result.data) return {}

  const p = result.data
  const description = p.seo_description ?? p.description.slice(0, 155)
  const ogImage = p.images?.[0] ?? p.image

  return {
    title: p.name,
    description,
    openGraph: {
      title: p.name,
      description,
      images: ogImage ? [{ url: ogImage }] : [{ url: '/og-image.jpg' }],
      type: 'website',
    },
    alternates: {
      canonical: `/catalog/${p.slug}`,
    },
  }
}
```

### Complete generateMetadata for blog post page

```typescript
// Source: Next.js official docs
// app/blog/[slug]/page.tsx

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const result = await supabase
    .from('blog_posts')
    .select('title, excerpt, featured_image, slug, published_at')
    .eq('slug', slug)
    .eq('published', true)
    .single()

  if (result.error || !result.data) return {}

  const post = result.data

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: post.featured_image
        ? [{ url: post.featured_image }]
        : [{ url: '/og-image.jpg' }],
      type: 'article',
      publishedTime: post.published_at ?? undefined,
    },
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
  }
}
```

### Homepage metadata (absolute title, no template)

```typescript
// app/page.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    absolute: 'Twinkle Locs | Nigerian Loc Beads & Accessories',
  },
  description: 'Handcrafted loc bead accessories designed for the modern loc wearer. Shop premium Nigerian loc accessories.',
  openGraph: {
    title: 'Twinkle Locs | Nigerian Loc Beads & Accessories',
    description: 'Handcrafted loc bead accessories designed for the modern loc wearer.',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
    type: 'website',
  },
}
```

**Note:** Use `title.absolute` on the homepage to bypass the `title.template` from the root layout. The template `%s | Twinkle Locs` would otherwise produce `Twinkle Locs | Nigerian Loc Beads & Accessories | Twinkle Locs`.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `next-seo` npm package | Native `Metadata` API | Next.js 13 App Router | No external package needed |
| `<Head>` component from `next/head` | `metadata` export / `generateMetadata()` | Next.js 13 App Router | `next/head` is Pages Router only |
| `getServerSideProps` for dynamic metadata | `generateMetadata()` async function | Next.js 13 App Router | Co-located with page, auto-memoized |
| Static `robots.txt` file in `/public` | `app/robots.ts` file convention | Next.js 13.3 | Dynamic generation via TypeScript |
| Static `sitemap.xml` file in `/public` | `app/sitemap.ts` file convention | Next.js 13.3 | Dynamic, fetches from DB at request time |
| `themeColor` in metadata | `viewport` export via `generateViewport` | Next.js 14 | Separate viewport config API |

**Deprecated/outdated:**
- `themeColor` in `Metadata` object: deprecated since Next.js 14, use `generateViewport` instead. Not needed for this phase.
- `viewport` in `Metadata` object: same deprecation. Next.js sets a sensible default; don't override unless needed.

---

## Database Changes Required

The `seo_description` field referenced in CONTEXT.md must be added before product metadata code is written.

### Migration SQL

```sql
ALTER TABLE products ADD COLUMN seo_description TEXT NULL;
```

### TypeScript type update required

Add to `src/types/supabase.ts` in the products `Row` type:

```typescript
seo_description: string | null
```

And add to `Insert` and `Update` types accordingly.

### Product interface update required

Add to `src/lib/types/product.ts`:

```typescript
export interface Product {
  // ... existing fields ...
  seo_description?: string | null
}
```

---

## Canonical URLs Decision

CONTEXT.md marks canonical URL handling as Claude's discretion. Recommendation: **add canonical tags**.

The middleware already redirects uppercase to lowercase, which prevents the main duplicate content issue. However, canonical tags provide an additional signal to search engines and are required when:
- The same product could theoretically be accessed via different query strings
- Social sharing tools inspect `<link rel="canonical">` directly

**Recommendation:** Add `alternates: { canonical: '/catalog/[slug]' }` to `generateMetadata()` for product and blog pages. Use relative paths since `metadataBase` handles the base URL. Skip canonicals on static pages (they are already unique URLs).

---

## Existing Page Metadata Audit

| Page | Current metadata | Action needed |
|------|-----------------|---------------|
| `app/layout.tsx` | `title: 'Twinkle Locs'`, generic description | Add `metadataBase`, add `title.template`, add global OG image |
| `app/page.tsx` (homepage) | Static export with title + description | Update title to spec, add `title.absolute`, add OG tags |
| `app/catalog/page.tsx` | Static export (good title, description) | Update title format to match `%s` template, add OG tags |
| `app/catalog/[slug]/page.tsx` | No metadata at all | Add `generateMetadata()` + Product JSON-LD + BreadcrumbList JSON-LD |
| `app/about/page.tsx` | Static export (reasonable) | Update title format, add OG tags |
| `app/faq/page.tsx` | Static export (good) | Add OG tags + FAQPage JSON-LD |
| `app/shipping/page.tsx` | Static export (good) | Add OG tags |
| `app/blog/page.tsx` | Static export (good) | Add OG tags |
| `app/blog/[slug]/page.tsx` | No metadata at all | Add `generateMetadata()` + BlogPosting JSON-LD |

---

## Open Questions

1. **seo_description field population**
   - What we know: The column doesn't exist yet; it must be added via migration.
   - What's unclear: Does the admin product form need a field for it? Or is it seeded manually in the DB?
   - Recommendation: The SEO phase should add the DB column and type. Wiring it into the admin product form is out of scope for SEO phase — use description fallback for now.

2. **og-image.jpg existence**
   - What we know: CONTEXT.md says "developer will provide asset at `/public/og-image.jpg`".
   - What's unclear: The file does not yet exist in `/public/`.
   - Recommendation: Plan should include a task to create a placeholder at the expected path so OG tags don't 404 during testing. The actual branded image can replace it later.

3. **Supabase Anon Key for sitemap.ts**
   - What we know: `createClient()` uses `cookies()` which makes the sitemap dynamically rendered per request.
   - What's unclear: Whether Vercel CDN caching is sufficient, or whether a separate lightweight Supabase fetch without `cookies()` would be better for performance.
   - Recommendation: Use existing `createClient()` for simplicity. The sitemap is a low-traffic URL; dynamic rendering is fine at this scale.

---

## Sources

### Primary (HIGH confidence)
- [Next.js generateMetadata docs](https://nextjs.org/docs/app/api-reference/functions/generate-metadata) — metadata object, generateMetadata function, openGraph, title template, merging behaviour, streaming metadata
- [Next.js sitemap.ts docs](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap) — MetadataRoute.Sitemap type, async sitemap with data fetching
- [Next.js robots.ts docs](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots) — MetadataRoute.Robots type, disallow syntax
- [Next.js JSON-LD guide](https://nextjs.org/docs/app/guides/json-ld) — script tag pattern, XSS sanitisation requirement, schema-dts optional typing

### Secondary (MEDIUM confidence)
- [Google Rich Results — Product Structured Data](https://developers.google.com/search/docs/appearance/structured-data/product-snippet) — required fields (name + one of offers/review/aggregateRating), recommended fields

### Tertiary (LOW confidence)
- WebSearch: JSON-LD hydration duplication concern — flagged in GitHub discussion but not reproduced in current Next.js 15; the official `<script>` tag pattern in Server Components does not duplicate in current versions.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against official Next.js 15 docs (version 16.2.1, lastUpdated 2026-03-31)
- Architecture patterns: HIGH — all code examples derived from official docs
- Database migration requirement: HIGH — confirmed by reading src/types/supabase.ts directly
- Pitfalls: HIGH (most), MEDIUM (AggregateRating Rich Results eligibility detail)
- JSON-LD schema fields: MEDIUM — Google's Rich Results requirements verified via official Google docs

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (Next.js metadata API is stable; sitemap/robots API is stable since v13.3)
