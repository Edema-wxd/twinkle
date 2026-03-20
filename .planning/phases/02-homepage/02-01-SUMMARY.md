---
phase: 02-homepage
plan: 01
subsystem: ui
tags: [mock-data, typescript, next-image, svg, products, testimonials]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Next.js app structure, src/lib/ directory, public/ directory, next.config.ts
provides:
  - MockProduct and MockProductVariant TypeScript interfaces in src/lib/mock/products.ts
  - FEATURED_PRODUCTS array with 4 real Twinkle Locs catalog items
  - Testimonial TypeScript interface and TESTIMONIALS array (3 items) in src/lib/mock/testimonials.ts
  - Placeholder SVG image at public/images/products/placeholder-bead.svg
  - next.config.ts updated with dangerouslyAllowSVG and CSP for SVG serving
affects:
  - 02-homepage plans 02-05 (all section components import from these mock files)
  - 03-catalog (MockProduct interface anticipates Phase 3 Supabase schema for easy swap)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Mock data layer in src/lib/mock/ with typed interfaces that mirror future Supabase schema"
    - "Variant-based pricing: price_min and price_max derived from variants array on each product"
    - "SVG placeholder images for product imagery before real photos exist"

key-files:
  created:
    - src/lib/mock/products.ts
    - src/lib/mock/testimonials.ts
    - public/images/products/placeholder-bead.svg
  modified:
    - next.config.ts

key-decisions:
  - "SVG placeholder over PNG: pure-code environment, on-brand cream/gold design, no binary files in repo"
  - "Large variant in_stock: false for all 4 products: reflects realistic stock scenario and tests UI state"
  - "MockProduct interface mirrors anticipated Phase 3 Supabase schema: swap in Phase 3 is a one-line import change"

patterns-established:
  - "Mock data in src/lib/mock/: all homepage static data lives here until Supabase tables exist"
  - "Variant IDs follow pattern var_NNNa/b/c for product NNN"

# Metrics
duration: 2min
completed: 2026-03-20
---

# Phase 2 Plan 01: Mock Data Layer Summary

**Typed mock data layer with 4 featured products (Naira variant pricing) and 3 testimonials, plus a branded SVG placeholder image so next/image renders without 404s**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-20T07:59:29Z
- **Completed:** 2026-03-20T08:01:14Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created `src/lib/mock/products.ts` with `MockProduct`, `MockProductVariant` interfaces and `FEATURED_PRODUCTS` (4 items: 24K Gold, Gold, Silver, Onyx beads) with 3 size variants each and Naira pricing
- Created `src/lib/mock/testimonials.ts` with `Testimonial` interface and `TESTIMONIALS` (3 items) from Nigerian customers
- Created branded 400x400 SVG placeholder at `public/images/products/placeholder-bead.svg` using brand palette (#FAF3E0 cream, #C9A84C gold) and updated `next.config.ts` to serve SVGs via `next/image`

## Task Commits

Each task was committed atomically:

1. **Task 1: Create mock data files (products + testimonials)** - `479d763` (feat)
2. **Task 2: Add placeholder product image** - `cb3129a` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `src/lib/mock/products.ts` - MockProductVariant, MockProduct interfaces; FEATURED_PRODUCTS array (4 products, 3 variants each, price_min/max)
- `src/lib/mock/testimonials.ts` - Testimonial interface; TESTIMONIALS array (3 customer quotes)
- `public/images/products/placeholder-bead.svg` - 400x400 branded placeholder, cream bg + gold circles and text
- `next.config.ts` - Added `dangerouslyAllowSVG: true` + `contentSecurityPolicy` to support next/image with SVG

## Decisions Made

- **SVG over PNG/JPG:** Plan specified SVG as the recommended approach. SVG is pure-text, version-controlled cleanly, and the brand colours (cream #FAF3E0 + gold #C9A84C) render well at any size without binary blobs in the repo.
- **Large variant out of stock for all products:** Realistic stock state that exercises the out-of-stock UI path (useful for testing the size picker modal in later plans).
- **Interface anticipates Supabase schema:** `MockProduct` field names (`id`, `name`, `slug`, `description`, `image`, `is_featured`, `variants`, `price_min`, `price_max`) match the planned Phase 3 products table columns. Swapping mock for real data in Phase 3 is a one-line import change.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Mock data layer is complete and TypeScript-clean. Any Phase 2 section component can `import { FEATURED_PRODUCTS } from "@/lib/mock/products"` or `import { TESTIMONIALS } from "@/lib/mock/testimonials"` immediately.
- `next/image` configured to serve SVG — placeholder renders without 404 or config error.
- `MockProduct` interface is schema-aligned with Phase 3 Supabase products table: no interface rework needed in Phase 3, only import swap.

---
*Phase: 02-homepage*
*Completed: 2026-03-20*
