---
phase: 05-cart-checkout
plan: 01
subsystem: ui
tags: [react, context, localStorage, typescript, cart, reducer]

# Dependency graph
requires:
  - phase: 04-product-detail
    provides: selectedVariantId and selectedTierQty state pattern (Phase 5 reads both for cart wiring)
  - phase: 04.1-csv-price-import
    provides: PriceTier shape and pack-size tier data needed for CartItem.tierQty and unitPrice
provides:
  - CartItem, CartState, CartAction types (src/lib/cart/types.ts)
  - cartReducer pure function with 7 actions including merge logic and max-10 cap
  - lineKey composite key function (productId:variantId:tierQty:threadColour)
  - THREAD_COLOURS const array with 5 locked colours and ThreadColourId derived type
  - CartProvider with localStorage rehydration and persistence
  - useCart hook available to all client components
  - Providers wrapper allowing layout.tsx to remain a Server Component
affects:
  - 05-02 (cart drawer UI)
  - 05-03 (product detail add-to-cart wiring)
  - 05-04 (cart page /cart)
  - 05-05 (checkout)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Providers pattern: 'use client' wrapper isolates context from Server Component layout"
    - "initialCartState SSR-safe: no localStorage access at init — HYDRATE dispatched in useEffect"
    - "lineKey composite key: productId:variantId:tierQty:threadColour — thread colour is merge axis"

key-files:
  created:
    - src/lib/cart/types.ts
    - src/lib/cart/cartReducer.ts
    - src/lib/cart/threadColours.ts
    - src/lib/cart/CartContext.tsx
    - src/components/providers.tsx
  modified:
    - src/app/layout.tsx

key-decisions:
  - "CartProvider reads localStorage after mount only (HYDRATE in useEffect) — avoids SSR/hydration mismatch"
  - "Only items persisted to localStorage; isDrawerOpen not persisted — drawer closed on every page load"
  - "ADD_ITEM auto-opens drawer (isDrawerOpen: true) — per CONTEXT.md cart drawer spec"
  - "lineKey includes threadColour — two items same size+pack but different thread colour are separate line items"
  - "Providers 'use client' wrapper keeps layout.tsx as a Server Component"

patterns-established:
  - "Providers pattern: layout.tsx imports Providers (client), wraps body content — layout stays Server Component"
  - "useCart hook throws if called outside CartProvider — explicit error over silent null"
  - "ADD_ITEM merges by lineKey: increments existing quantity up to max 10, else appends new item"

# Metrics
duration: 12min
completed: 2026-03-23
---

# Phase 5 Plan 01: Cart State Layer Summary

**localStorage-backed cart context with useReducer, 7-action reducer with merge/max-10 logic, and 5 locked thread colours wrapped via Providers pattern keeping layout.tsx a Server Component**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-23T17:22:49Z
- **Completed:** 2026-03-23T17:34:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Cart state foundation complete: types, reducer, context, and thread colour constants all typed and compiled
- CartProvider rehydrates from localStorage after mount to avoid SSR/hydration mismatch; persists only items (not drawer state) on change
- Providers wrapper isolates `'use client'` boundary from layout.tsx, keeping layout a Server Component

## Task Commits

Each task was committed atomically:

1. **Task 1: Cart types, reducer, and thread colour constants** - `bb69546` (feat)
2. **Task 2: CartContext, Providers wrapper, layout.tsx integration** - `f20e216` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/lib/cart/types.ts` - CartItem, CartState, CartAction discriminated union
- `src/lib/cart/cartReducer.ts` - cartReducer (7 actions), lineKey, initialCartState
- `src/lib/cart/threadColours.ts` - THREAD_COLOURS const array (5 colours), ThreadColourId type
- `src/lib/cart/CartContext.tsx` - CartProvider with localStorage rehydration + useCart hook
- `src/components/providers.tsx` - Providers 'use client' wrapper for layout.tsx
- `src/app/layout.tsx` - Wrapped body content in <Providers>

## Decisions Made

- CartProvider reads localStorage after mount only (HYDRATE dispatched in useEffect with empty deps) — avoids SSR mismatch where server and client render different initial states
- Only `state.items` persisted to localStorage; `isDrawerOpen` intentionally not persisted — drawer always closed on fresh page load
- `ADD_ITEM` sets `isDrawerOpen: true` — cart drawer auto-opens on every add, per CONTEXT.md spec
- `lineKey` includes `threadColour` as the fourth segment — identical size+pack with different thread colour creates a separate line item (correct behaviour per CONTEXT.md)
- Silent catch on both localStorage read and write — corrupt or unavailable storage starts fresh without crashing

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compiled clean first attempt, build passed without errors.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `useCart()` hook is ready for any client component to import and dispatch actions
- `ADD_ITEM` action payload shape matches what the product detail page (`ProductDetailClient`) will need to send: productId, variantId, tierQty, threadColour, productName, variantName, unitPrice, imageUrl, isTool, quantity
- Thread colour picker (05-02 or 05-03) can use `THREAD_COLOURS` array and `ThreadColourId` type directly
- Cart drawer (next plan) should dispatch `CLOSE_DRAWER` on close and read `state.isDrawerOpen` to control visibility

---
*Phase: 05-cart-checkout*
*Completed: 2026-03-23*
