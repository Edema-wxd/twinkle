---
phase: 09-seo
plan: "03"
subsystem: seo
tags: [next.js, json-ld, schema-org, sitemap, structured-data, supabase]

# Dependency graph
requires:
  - phase: 09-01
    provides: root layout metadataBase, NEXT_PUBLIC_SITE_URL env var, seo_description column on products
  - phase: 09-02
    provides: generateMetadata on catalog/[slug] and blog/[slug], robots.ts, static metadata on all public pages

provides:
  - Product JSON-LD (Schema.org Product + Offer in NGN + conditional AggregateRating) on /catalog/[slug]
  - BreadcrumbList JSON-LD (Home > Catalog > Product Name) on /catalog/[slug]
  - FAQPage JSON-LD mapping all accordion questions on /faq
  - BlogPosting JSON-LD (headline, dates, author, publisher) on /blog/[slug]
  - Dynamic sitemap at /sitemap.xml fetching active products + published blog posts from Supabase
affects: [future phases adding new public routes — must add to staticRoutes in sitemap.ts]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - JSON-LD injected via dangerouslySetInnerHTML with .replace(/</g, '\\u003c') XSS sanitisation
    - JSON-LD objects constructed before return statement using already-fetched data (no extra Supabase calls)
    - Conditional spread for optional JSON-LD fields (AggregateRating only when reviews.length > 0)
    - sitemap.ts uses Promise.all to fetch products and blog_posts concurrently
    - changeFrequency string literals use 'as const' to satisfy MetadataRoute.Sitemap type constraint

key-files:
  created:
    - src/app/sitemap.ts
  modified:
    - src/app/catalog/[slug]/page.tsx
    - src/app/faq/page.tsx
    - src/app/blog/[slug]/page.tsx

key-decisions:
  - "JSON-LD BASE constant derived from NEXT_PUBLIC_SITE_URL with twinklelocs.com fallback — consistent with robots.ts and generateMetadata patterns"
  - "Product JSON-LD price field uses product.price_min (lowest tier) — sitemap and schema use lowest visible price per Google guidance"
  - "blog_posts updated_at is a required string field (not nullable) — used directly as dateModified without null guard"
  - "New public routes added in the future must be registered in staticRoutes array inside src/app/sitemap.ts"

patterns-established:
  - "JSON-LD pattern: construct object before return using already-fetched Server Component data; inject via <script type=application/ld+json> with XSS sanitisation"
  - "sitemap.ts: static routes array + dynamic routes from Promise.all Supabase fetches; .eq filter ensures only live content is indexed"

# Metrics
duration: 15min
completed: 2026-03-31
---

# Phase 9 Plan 03: Structured Data + Sitemap Summary

**Schema.org JSON-LD structured data on product detail, FAQ, and blog post pages, plus a dynamic sitemap.xml fetching active products and published blog posts from Supabase — completes the SEO phase**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-31T00:50:00Z
- **Completed:** 2026-03-31T01:05:00Z
- **Tasks:** 2
- **Files modified:** 3 modified, 1 created

## Accomplishments
- Product detail pages embed two JSON-LD blocks: Schema.org Product (with NGN priceCurrency, InStock/OutOfStock availability, conditional AggregateRating) and BreadcrumbList (3 items: Home > Catalog > Product Name)
- /faq embeds FAQPage JSON-LD mapping all accordion questions — eligible for Google FAQ rich results in search
- /blog/[slug] embeds BlogPosting JSON-LD with headline, excerpt, featured image, datePublished, dateModified, and Organization author/publisher
- /sitemap.xml served dynamically from src/app/sitemap.ts — 6 static routes plus all active products and published blog posts fetched concurrently from Supabase
- Production build passes cleanly; /sitemap.xml listed as dynamic Next.js route

## Task Commits

Each task was committed atomically:

1. **Task 1: Product + BreadcrumbList JSON-LD** - `5fea19e` (feat)
2. **Task 2: FAQPage + BlogPosting JSON-LD + sitemap.ts** - `3700a38` (feat)

**Plan metadata:** see final commit below

## Files Created/Modified
- `src/app/catalog/[slug]/page.tsx` - Added Product + BreadcrumbList JSON-LD blocks before visible content; AggregateRating conditional on reviews array
- `src/app/faq/page.tsx` - Added FAQPage JSON-LD mapping faqs array from Supabase; first child inside main
- `src/app/blog/[slug]/page.tsx` - Added BlogPosting JSON-LD with all required fields; BASE derived from NEXT_PUBLIC_SITE_URL
- `src/app/sitemap.ts` - New file: dynamic sitemap with 6 static routes + concurrent Supabase fetches for active products and published blog posts

## Decisions Made
- JSON-LD injected directly in Server Component render (no extra fetches) — product/post data already available in component body from existing Supabase calls
- `product.price_min` used as Schema.org Offer price — lowest visible price, consistent with Google Product schema guidance
- `blog_posts.updated_at` is a required non-nullable string per supabase.ts — used directly as dateModified without null guard
- Any new public routes added in future phases must be registered in the `staticRoutes` array in `src/app/sitemap.ts`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Phase 9 (SEO) is now fully complete — all 3 plans executed
- All public pages have metadata (09-02) + structured data (09-03)
- /robots.txt and /sitemap.xml are both live and correctly scoped
- No blockers for Phase 10 or any subsequent phase
- Future: when new public routes are added, register them in `staticRoutes` in `src/app/sitemap.ts`

---
*Phase: 09-seo*
*Completed: 2026-03-31*
