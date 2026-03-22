---
phase: 04-product-detail
plan: 03
subsystem: ui
tags: [react, nextjs, tailwind, typescript, product-detail, client-component]

# Dependency graph
requires:
  - phase: 04-02
    provides: ProductImageGallery component and product detail page skeleton with Supabase fetch
  - phase: 03-03
    provides: CatalogClient, FilterBar, and product catalog routing
  - phase: 01
    provides: Product type, Supabase client, layout, theme tokens

provides:
  - ProductDetailClient 'use client' island with inline variant picker, quantity stepper, thread colour swatches, Add to Cart button
  - page.tsx wired to ProductDetailClient — no duplicate product info rendering

affects:
  - 05-cart (Add to Cart button TODO comment is Phase 5 entry point)
  - any phase that extends thread colour selection

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Fragment-as-grid-children: ProductDetailClient returns <> with gallery + info div; CSS grid places them in two columns automatically
    - Client island wraps sub-components needing useState: ProductImageGallery (selected image index) and variant picker coexist in one 'use client' boundary
    - First-in-stock initialisation: useState initialised with Array.find(v => v.in_stock)?.id to skip disabled variants on first render

key-files:
  created:
    - src/components/product/ProductDetailClient.tsx
  modified:
    - src/app/catalog/[slug]/page.tsx

key-decisions:
  - "ProductDetailClient fragment pattern: returns <> with two children (gallery + info div) so page.tsx grid cols receive them without wrapper div breaking grid flow"
  - "Gallery internal to ProductDetailClient: ProductImageGallery requires useState so it must live inside a 'use client' boundary; co-locating it in ProductDetailClient avoids a second client island"
  - "MATERIAL_BADGE map duplicated in ProductDetailClient: page.tsx no longer needs it after refactor; co-location is cleaner than a shared constant file for two consumers"

patterns-established:
  - "Fragment-as-grid-children: client island returns <></> so parent grid sees two block elements without needing wrapper div"
  - "First-in-stock initialisation: variant picker pre-selects first in_stock variant using find() in useState initialiser"

# Metrics
duration: 15min
completed: 2026-03-22
---

# Phase 4 Plan 03: ProductDetailClient Summary

**Inline variant picker with price-reactive selection, quantity stepper (1-10), decorative thread colour swatches, and Add to Cart no-op wired into the product detail page grid via a fragment pattern**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-22T00:00:00Z
- **Completed:** 2026-03-22T00:15:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Built `ProductDetailClient` as a `'use client'` island: material badge, product name h1, price (reactive to variant selection), description, size picker, quantity stepper, thread colour swatches, Add to Cart button
- Size picker pre-selects first in-stock variant; out-of-stock variants are dimmed, `disabled`, and show "(Out of stock)" label
- Price display updates immediately on variant click via `selectedVariant?.price` derivation
- Quantity stepper uses functional updater `setQuantity(q => Math.max(1, q - 1))` with visual disabled state at boundaries
- Thread colour swatches are 5 decorative 32px circles with `// TODO Phase 5` comment for cart line item wiring
- `ProductDetailClient` returns a `<>` fragment so the two children slot directly into page.tsx's `grid-cols-2` without extra wrapper divs
- `ProductImageGallery` is now internal to `ProductDetailClient` — eliminates the need for a second client island boundary
- page.tsx simplified: removed 35 lines of placeholder product info; now just passes `product` prop to client island

## Task Commits

1. **Task 1: Build ProductDetailClient island** - `8ba974b` (feat)
2. **Task 2: Wire ProductDetailClient into page.tsx** - `bb72fc7` (feat)

**Plan metadata:** (pending — docs commit)

## Files Created/Modified

- `src/components/product/ProductDetailClient.tsx` — new client island; variant picker, quantity stepper, swatches, Add to Cart
- `src/app/catalog/[slug]/page.tsx` — replaced placeholder div with `<ProductDetailClient product={product} />`; removed separate ProductImageGallery import

## Decisions Made

- **Fragment-as-grid-children pattern**: ProductDetailClient returns `<>` so gallery and info div are direct grid children. Alternative (wrapping in `<div className="contents">`) was messier — fragment is idiomatic.
- **Gallery inside client island**: ProductImageGallery needs `useState` for selected thumbnail index. Rather than a second `'use client'` wrapper, it co-locates with ProductDetailClient — single hydration boundary.
- **MATERIAL_BADGE duplication**: The map existed in page.tsx (Plan 04-02) and is now in ProductDetailClient. Page.tsx no longer needs it. Co-location preferred over a separate shared constants file at this scale.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Product detail page is fully interactive: variant picker, quantity stepper, thread colours, Add to Cart button
- Phase 5 cart wiring has two clear TODO entry points: `onClick` in Add to Cart button and thread colour swatches section
- `/catalog/shears` shows single "Standard" variant (in-stock), no disabled states — simple product works correctly
- Zero TypeScript errors, clean `npm run build`

---
*Phase: 04-product-detail*
*Completed: 2026-03-22*
