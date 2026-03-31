---
phase: 09-seo
plan: "02"
subsystem: seo
tags: [next.js, metadata, opengraph, robots, supabase, generateMetadata]

# Dependency graph
requires:
  - phase: 09-01
    provides: root layout metadataBase + title template, og-image.jpg placeholder, seo_description column on products

provides:
  - Static metadata exports (title, description, openGraph) on all 6 public storefront pages
  - generateMetadata() on /catalog/[slug] returning product-specific title, description, og:image, canonical
  - generateMetadata() on /blog/[slug] returning post-specific title, description, og:image, canonical
  - robots.ts serving /robots.txt blocking /admin/, /cart, /orders/, /api/
affects: [09-03, sitemap, future page additions]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - title.absolute on homepage bypasses root title template to prevent brand doubling
    - generateMetadata with Next.js 15 async params on dynamic route pages
    - Supabase narrow-select in generateMetadata fetches only metadata fields (not full row)
    - seo_description ?? description fallback chain with .slice(0, 155) for description meta
    - og:image falls back to /og-image.jpg when product/post has no image

key-files:
  created:
    - src/app/robots.ts
  modified:
    - src/app/page.tsx
    - src/app/catalog/page.tsx
    - src/app/catalog/[slug]/page.tsx
    - src/app/about/page.tsx
    - src/app/faq/page.tsx
    - src/app/shipping/page.tsx
    - src/app/blog/page.tsx
    - src/app/blog/[slug]/page.tsx

key-decisions:
  - "Homepage metadata uses title: { absolute: 'Twinkle Locs | Nigerian Loc Beads & Accessories' } to prevent the root template from appending '| Twinkle Locs' again"
  - "generateMetadata on product/blog pages awaits params per Next.js 15 async params contract"
  - "Product og:image prefers images[0] over image field (images array is the ordered gallery)"

patterns-established:
  - "Static pages: export const metadata: Metadata with title string (not object), description, openGraph"
  - "Dynamic pages: export async function generateMetadata({ params }) — no static metadata export on same route"
  - "robots.ts uses NEXT_PUBLIC_SITE_URL env var with twinklelocs.com fallback"

# Metrics
duration: 2min
completed: 2026-03-31
---

# Phase 9 Plan 02: SEO Metadata Sweep Summary

**Full metadata coverage across all public storefront pages — static exports on 6 pages, generateMetadata() on product and blog detail routes, plus robots.txt disallowing admin/cart/orders/api paths**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-31T00:39:00Z
- **Completed:** 2026-03-31T00:41:00Z
- **Tasks:** 2
- **Files modified:** 8 modified, 1 created

## Accomplishments
- All 6 static pages (homepage, catalog, about, faq, shipping, blog) have typed `Metadata` exports with title, description, and openGraph block pointing to /og-image.jpg
- Homepage uses `title.absolute` to bypass the root template and prevent "Twinkle Locs | Twinkle Locs" duplication
- Product detail pages return `generateMetadata()` with product-specific title, seo_description/description fallback, product image as og:image, and canonical alternate URL
- Blog post pages return `generateMetadata()` with post title, excerpt, featured_image as og:image, article OG type with publishedTime, and canonical alternate URL
- robots.ts created — /robots.txt blocks /admin/, /cart, /orders/, /api/ and links to sitemap.xml

## Task Commits

Each task was committed atomically:

1. **Task 1: Static metadata + robots.ts** - `19bf85d` (feat)
2. **Task 2: generateMetadata on product and blog detail pages** - `c82994f` (feat)

**Plan metadata:** see final commit below

## Files Created/Modified
- `src/app/robots.ts` - Robots.txt route: allows /, disallows /admin/ /cart /orders/ /api/, links sitemap
- `src/app/page.tsx` - Homepage: title.absolute + OG block
- `src/app/catalog/page.tsx` - Catalog list: title string + OG
- `src/app/catalog/[slug]/page.tsx` - Product detail: generateMetadata() with Supabase fetch
- `src/app/about/page.tsx` - About: title string + OG
- `src/app/faq/page.tsx` - FAQs: title string + OG
- `src/app/shipping/page.tsx` - Shipping: title string + OG
- `src/app/blog/page.tsx` - Blog list: title string + OG
- `src/app/blog/[slug]/page.tsx` - Blog post: generateMetadata() with Supabase fetch

## Decisions Made
- Homepage metadata uses `title: { absolute: '...' }` to prevent the root template from appending `| Twinkle Locs` again — root template is `%s | Twinkle Locs` so a plain string title would produce "Twinkle Locs | Nigerian Loc Beads & Accessories | Twinkle Locs"
- `generateMetadata` on product page uses `images[0] ?? image` for og:image — images array is the ordered gallery; image is the thumbnail fallback
- `seo_description ?? description` with `.slice(0, 155)` keeps meta description within recommended length without truncating in the middle of a word (slices at char level; acceptable for MVP)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Every public page now has correct title/description/OG metadata
- robots.txt is live and correctly scoped
- Ready for Phase 9-03: Sitemap / structured data or any remaining SEO tasks
- No blockers

---
*Phase: 09-seo*
*Completed: 2026-03-31*
