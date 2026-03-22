---
phase: 04-product-detail
plan: 02
subsystem: ui
tags: [next.js, supabase, server-component, image-gallery, not-found, typescript]

# Dependency graph
requires:
  - phase: 04-01
    provides: Product type with images field, Review type, schema.sql, supabase.ts typed client

provides:
  - ProductImageGallery client component (images array + conditional thumbnail rail)
  - Full product detail page: breadcrumb, gallery, material badge, h1, price, description
  - Branded not-found page for invalid slugs
  - Fixed supabase.ts Database type to satisfy GenericSchema/GenericTable constraints

affects:
  - 04-03 (ProductDetailClient island with variant picker — mounts inside this page)
  - 04-04 (reviews section — appended below product info on same page)
  - Future plans querying Supabase with typed client

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server Component product page fetches from Supabase and calls notFound() on missing slug
    - Client island (ProductImageGallery) mounted inside Server Component layout
    - result.data pattern for Supabase queries (not destructured) to enable TS narrowing
    - Supabase Database type requires Relationships:[] per table and [_ in never]:never for empty dicts

key-files:
  created:
    - src/components/product/ProductImageGallery.tsx
    - src/app/catalog/[slug]/not-found.tsx
  modified:
    - src/app/catalog/[slug]/page.tsx
    - src/types/supabase.ts

key-decisions:
  - "result.data narrowing pattern: assign supabase result to const result then check result.error || !result.data — destructuring data kills TS narrowing"
  - "Supabase GenericTable requires Relationships:[] on each table definition"
  - "Views/Functions/Enums/CompositeTypes must use [_ in never]:never not Record<string,never> to satisfy GenericSchema"
  - "ProductImageGallery uses object-contain not object-cover for SVG placeholder transparency"
  - "Material badge colours match CatalogProductCard palette: Gold/Silver/Crystal/Tools"

patterns-established:
  - "Supabase query pattern: const result = await supabase.from().select().eq().single(); if (result.error || !result.data) return notFound(); const row = result.data"
  - "ProductImageGallery: thumbnail rail conditional on images.length > 1 — all current products have single image so rail is always hidden"

# Metrics
duration: 41min
completed: 2026-03-22
---

# Phase 4 Plan 02: Product Detail Page Skeleton Summary

**Server-rendered product detail page with ProductImageGallery client component and branded 404, fetching from Supabase by slug with correct Database types**

## Performance

- **Duration:** 41 min
- **Started:** 2026-03-22T17:18:01Z
- **Completed:** 2026-03-22T17:59:26Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- ProductImageGallery `'use client'` component with main image + conditional thumbnail rail (hidden when single image)
- Full product detail page Server Component: breadcrumb, gallery, material badge, h1, price range, description placeholder for Plan 04-03 variant picker
- Branded not-found page rendered by Next.js notFound() for invalid slugs
- Fixed supabase.ts Database type to satisfy postgrest-js GenericSchema/GenericTable structural constraints — enables typed .from().select().single() queries across the codebase

## Task Commits

Each task was committed atomically:

1. **Task 1: Build ProductImageGallery client component** — `1f3166f` (feat)
2. **Task 2: Replace stub with full product detail page + not-found** — `a3efd75` (feat)

**Plan metadata:** (created in final commit below)

## Files Created/Modified

- `src/components/product/ProductImageGallery.tsx` — 'use client' component; main image with next/image fill+object-contain; thumbnail rail rendered only when images.length > 1
- `src/app/catalog/[slug]/page.tsx` — async Server Component; Supabase fetch by slug; notFound() for missing; breadcrumb, gallery, product info layout
- `src/app/catalog/[slug]/not-found.tsx` — centered branded 404 with font-display heading and Back to catalog link
- `src/types/supabase.ts` — added Relationships:[] to products/reviews tables; changed empty dicts to [_ in never]:never to satisfy GenericSchema

## Decisions Made

- **result.data narrowing pattern:** `const result = await supabase...single()` then `if (result.error || !result.data) return notFound()` — destructuring `data` before the guard makes TypeScript unable to narrow, leaving data as `never`
- **Supabase Database type fix:** postgrest-js `GenericTable` requires `Relationships: GenericRelationship[]`. Our manual type was missing this. Also `Record<string, never>` does not satisfy `Record<string, GenericFunction>` — `[_ in never]: never` (empty mapped type) does.
- **object-contain for gallery images:** SVGs have transparent backgrounds; object-cover would stretch. object-contain preserves aspect ratio inside bg-stone container.
- **Material badge colours:** Matched spec — Gold: gold/20+cocoa, Silver: stone+charcoal, Crystal: cream+charcoal border, Tools: forest/20+forest

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed supabase.ts Database type to satisfy GenericSchema constraints**

- **Found during:** Task 2 (Replace stub with full product detail page)
- **Issue:** `src/types/supabase.ts` was missing `Relationships: []` on table definitions and used `Record<string, never>` for Views/Functions/Enums/CompositeTypes. This caused `@supabase/postgrest-js` to resolve `.from('products').select('*').single()` as `never` type, making it impossible to access any properties on the query result.
- **Fix:** Added `Relationships: []` to products and reviews table definitions. Changed `Record<string, never>` empty dicts to `{ [_ in never]: never }` mapped type — matches what Supabase CLI generates and correctly satisfies `GenericSchema`/`GenericTable` structural constraints.
- **Files modified:** `src/types/supabase.ts`
- **Verification:** `npx tsc --noEmit` passes with zero errors after fix
- **Committed in:** `a3efd75` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug in manually-maintained type file)
**Impact on plan:** Fix was essential for any Supabase query to work in a typed context. No scope creep — types now match what Supabase CLI would generate.

## Issues Encountered

- TypeScript narrowing fails with `if (!destructuredData) return notFound()` — required using `result.data` property access pattern instead. Documented as established pattern for future plans.

## User Setup Required

None — no external service configuration required. (Supabase connection requires .env.local values already noted as a blocker in STATE.md.)

## Next Phase Readiness

- Page skeleton complete — gallery, breadcrumb, product info all rendering
- Plan 04-03 slots `<ProductDetailClient product={product} />` in place of the placeholder div in the right column
- ProductImageGallery is fully wired — just needs real multi-image data when available
- supabase.ts type fix unblocks all future Supabase queries across the codebase

---
*Phase: 04-product-detail*
*Completed: 2026-03-22*
