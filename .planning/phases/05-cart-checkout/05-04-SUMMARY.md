---
phase: 05-cart-checkout
plan: 04
subsystem: ui
tags: [react, cart, drawer, next-image, tailwind, animation, header]

# Dependency graph
requires:
  - phase: 05-01
    provides: CartItem/CartState/CartAction types, cartReducer, lineKey, useCart hook, CartProvider, THREAD_COLOURS
  - phase: 05-03
    provides: thread colour picker and handleAddToCart wiring in ProductDetailClient
provides:
  - CartLineItem component: thumbnail, colour swatch, qty controls, remove button
  - CartDrawer slide-out panel: backdrop, Escape key, empty state, subtotal, checkout CTA
  - Header cart badge: live totalItems count capped at 9+, dispatches OPEN_DRAWER
  - CartDrawer mounted globally in Providers — always available regardless of route
affects:
  - 05-05 (checkout page — CartDrawer links to /checkout)
  - 05-06 (cart page /cart — CartLineItem reused)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CartDrawer globally mounted in Providers — always responds to OPEN_DRAWER regardless of current route"
    - "Backdrop + drawer animate independently via opacity/translate transitions — no JS animation library"
    - "body.style.overflow locked while CartDrawer open — same pattern as MobileDrawer"
    - "Header cart button dispatches OPEN_DRAWER instead of navigating to /cart — drawer-first UX"

key-files:
  created:
    - src/components/cart/CartLineItem.tsx
    - src/components/cart/CartDrawer.tsx
  modified:
    - src/components/layout/Header.tsx
    - src/components/providers.tsx

key-decisions:
  - "CartDrawer mounted in Providers (not layout.tsx directly) — keeps layout.tsx a Server Component, drawer always available globally"
  - "Header Cart text replaced with button dispatching OPEN_DRAWER — drawer-first experience; /cart page still accessible from mobile drawer"
  - "Checkout CTA renders as disabled div (not hidden) when cart empty — consistent footer height, no layout shift"
  - "Escape key and backdrop both dispatch CLOSE_DRAWER — consistent close behaviour matching MobileDrawer pattern"

patterns-established:
  - "CartLineItem re-exported lineKey for consumer convenience — single import point"
  - "CartDrawer body scroll lock mirrors MobileDrawer pattern — consistent UX"
  - "Badge capped at '9+' label when totalItems > 9 — standard e-commerce convention"

# Metrics
duration: 18min
completed: 2026-03-24
---

# Phase 5 Plan 04: Cart Drawer Summary

**Slide-out cart drawer with CSS translate animation, line items showing thumbnail/colour swatch/qty controls, subtotal footer, and Header badge dispatching OPEN_DRAWER — all mounted globally via Providers**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-24T00:00:00Z
- **Completed:** 2026-03-24T00:18:00Z
- **Tasks:** 2
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- CartLineItem component renders full line item: 64x64 thumbnail, variantName + pack size, thread colour circle swatch + label (hidden for Tools), unit price in gold, +/- qty controls capped at 10, Remove button
- CartDrawer slides in from right via translate-x CSS transition; backdrop fades via opacity; Escape key and backdrop click both dispatch CLOSE_DRAWER; body scroll locked while open
- Header Cart text converted to button that dispatches OPEN_DRAWER with live badge (w-5 h-5 bg-gold) showing totalItems count (capped at 9+)

## Task Commits

Each task was committed atomically:

1. **Task 1: CartLineItem component** - `86ba123` (feat)
2. **Task 2: CartDrawer component + Header cart icon badge** - `2c339a6` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/components/cart/CartLineItem.tsx` - Line item row: thumbnail, product name, variant/pack, thread colour swatch+label, unit price, +/- qty buttons (max 10), Remove button; re-exports lineKey
- `src/components/cart/CartDrawer.tsx` - Slide-out drawer: backdrop + panel with translate transition, items list or empty state, subtotal footer, Checkout CTA Link to /checkout
- `src/components/layout/Header.tsx` - Added useCart import; Cart text replaced with button dispatching OPEN_DRAWER; gold badge showing totalItems (capped at 9+)
- `src/components/providers.tsx` - Added CartDrawer import; mounted as sibling of children inside CartProvider

## Decisions Made

- CartDrawer mounted in Providers (not layout.tsx) — Providers is already a 'use client' boundary; adding CartDrawer here avoids layout.tsx becoming a client component
- Header Cart replaced with `<button>` dispatching `OPEN_DRAWER` rather than navigating to `/cart` — drawer opens immediately on click; /cart still reachable from mobile nav drawer
- Checkout CTA renders as a disabled-looking `<div aria-hidden>` (not hidden) when cart is empty — footer height stays consistent, no layout shift between empty and filled state
- Empty state uses inline SVG bag illustration (no external dependency) — minimal bundle impact

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compiled clean, build passed without errors on first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CartDrawer is fully wired: OPEN_DRAWER/CLOSE_DRAWER/UPDATE_QTY/REMOVE_ITEM all dispatch correctly
- CartLineItem is ready for reuse on the /cart page (plan 05-06) — same component, same props interface
- Checkout CTA links to /checkout — plan 05-05 (checkout flow) can build that route directly
- Header badge live-updates from CartContext — no additional wiring needed for badge after items are added

---
*Phase: 05-cart-checkout*
*Completed: 2026-03-24*
