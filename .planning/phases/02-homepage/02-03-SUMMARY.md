---
phase: 02-homepage
plan: 03
subsystem: ui
tags: [nextjs, react, tailwind, client-components, server-components, modal, carousel, mock-data]

# Dependency graph
requires:
  - phase: 02-01
    provides: mock data (FEATURED_PRODUCTS, TESTIMONIALS) from src/lib/mock/
  - phase: 02-02
    provides: HeroSection, BrandStorySection, InstagramCTASection server components
provides:
  - ProductCard server component with image, price range, onAddToCart prop
  - AddToCartModal client component with Escape key, overlay click-outside, body scroll lock, variant picker
  - FeaturedProductsSection client island owning modal state, accepting products prop
  - TestimonialsSection client island with 5s auto-rotation and dot indicators
  - Complete homepage at src/app/page.tsx — Server Component assembling all five sections
affects:
  - Phase 3 (Supabase catalog) — FeaturedProductsSection accepts products prop, one-line swap from mock to real data
  - Phase 5 (cart) — AddToCartModal has TODO comment for cart context wiring

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Client island pattern — FeaturedProductsSection/TestimonialsSection are 'use client' leaf islands; page.tsx remains Server Component
    - Props-down data flow — page.tsx imports mock data, passes as props; components stay reusable for Phase 3 swap
    - Body scroll lock in useEffect cleanup — document.body.style.overflow reset on modal unmount
    - Functional updater in interval — setIdx(i => (i + 1) % n) avoids stale closure without idx in deps

key-files:
  created:
    - src/components/home/ProductCard.tsx
    - src/components/home/AddToCartModal.tsx
    - src/components/home/FeaturedProductsSection.tsx
    - src/components/home/TestimonialsSection.tsx
  modified:
    - src/app/page.tsx

key-decisions:
  - "ProductCard has no 'use client' — it is rendered inside FeaturedProductsSection (client), so it joins the client bundle without needing its own directive"
  - "FeaturedProductsSection does not import FEATURED_PRODUCTS itself — data flows from page.tsx so Phase 3 can pass real Supabase data with no component change"
  - "TestimonialsSection useEffect uses functional updater setIdx(i => ...) with testimonials.length (not idx) in deps — avoids interval teardown on each tick"
  - "AddToCartModal 'Add to cart' button calls onClose() as Phase 2 no-op with TODO comment for Phase 5 cart context"

patterns-established:
  - "Client island pattern: interactive sections declare 'use client', page.tsx stays Server Component"
  - "Props-down data: page.tsx owns data imports, passes as typed props to reusable sections"
  - "Escape + overlay + scroll lock: all modals follow this three-part interaction pattern"

# Metrics
duration: 12min
completed: 2026-03-20
---

# Phase 2 Plan 03: Interactive Homepage Islands Summary

**Four interactive client components (ProductCard, AddToCartModal, FeaturedProductsSection, TestimonialsSection) completing the homepage at /, with variant picker modal, auto-rotating testimonials, and full Next.js build passing.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-20T08:05:03Z
- **Completed:** 2026-03-20T08:17:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Full featured products island: 4 product cards from mock data, Add to Cart modal with size picker, out-of-stock variant states, Escape/overlay/scroll lock
- Testimonials carousel: auto-rotates every 5 seconds with functional updater (no stale closure), dot indicators for manual navigation
- Complete homepage assembled in page.tsx as Server Component — all 5 sections in order, build passes, TypeScript clean

## Task Commits

1. **Task 1: ProductCard, AddToCartModal, and FeaturedProductsSection** - `8a9498b` (feat)
2. **Task 2: TestimonialsSection and final page.tsx assembly** - `4fb0ffb` (feat)

## Files Created/Modified

- `src/components/home/ProductCard.tsx` - Server Component: product image (fill), Naira price range, onAddToCart prop
- `src/components/home/AddToCartModal.tsx` - Client Component: Escape key handler, overlay click-outside, body scroll lock, variant picker with out-of-stock state
- `src/components/home/FeaturedProductsSection.tsx` - Client Component: selectedProduct state, 4-column responsive grid, "Shop the Collection" CTA to /catalog
- `src/components/home/TestimonialsSection.tsx` - Client Component: 5s interval with functional updater and clearInterval cleanup, initials avatar, dot indicators
- `src/app/page.tsx` - Server Component: replaced placeholder with full homepage — metadata export + 5 sections in order

## Decisions Made

- ProductCard declared without `'use client'` — rendered inside a client parent (FeaturedProductsSection), so it correctly joins the client bundle without an explicit directive. Keeps component intent clear.
- FeaturedProductsSection receives `products` as prop (not importing FEATURED_PRODUCTS) — enables Phase 3 to pass real Supabase data to the same component with no code change.
- TestimonialsSection useEffect dependency is `testimonials.length` (not `idx`) — functional updater `i => (i + 1) % n` captures no stale state, avoiding unnecessary interval recreation on every rotation.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Homepage is complete. All five sections render at root URL. Build and TypeScript are clean.
- Phase 3 (Supabase catalog/products) can replace mock data by passing real Supabase rows to FeaturedProductsSection and TestimonialsSection — the component interfaces are already shaped to match Phase 3 schema.
- Phase 5 (cart) should wire AddToCartModal's "Add to cart" button to cart context — TODO comment is in place at the button onClick.
- Blocker from STATE.md remains: .env.local has placeholder Supabase values — real keys needed before Phase 3 live data works.

---
*Phase: 02-homepage*
*Completed: 2026-03-20*
