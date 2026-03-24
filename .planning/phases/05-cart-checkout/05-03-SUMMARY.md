---
phase: 05-cart-checkout
plan: 03
subsystem: ui
tags: [react, cart, context, typescript, thread-colour, product-detail]

# Dependency graph
requires:
  - phase: 05-01
    provides: CartContext, useCart hook, ADD_ITEM action, THREAD_COLOURS const, CartItem type
  - phase: 04-product-detail
    provides: ProductDetailClient with selectedVariantId, selectedTierQty, displayPrice state
provides:
  - Interactive thread colour picker with 5 swatches and visual selection state
  - Fully wired Add to Cart button dispatching ADD_ITEM with all 9 CartItem fields
  - canAddToCart guard disabling button until colour selected (bead products)
  - Auto-reset of thread colour on variant (size) switch
affects:
  - 05-04 (cart drawer UI - reads items dispatched here)
  - 05-05 (checkout - order items originate from these cart entries)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "canAddToCart derived value: Tools products auto-enabled, bead products require explicit colour selection"
    - "handleVariantChange cascades resets: variantId → tierQty → threadColour in one function"

key-files:
  created: []
  modified:
    - src/components/product/ProductDetailClient.tsx

key-decisions:
  - "selectedThreadColour initialised as empty string for Tools, null for beads — null acts as disabled sentinel"
  - "canAddToCart = product.material === 'Tools' || selectedThreadColour !== null — single derived boolean"
  - "Required badge shown while selectedThreadColour is null — disappears on selection, no separate UI state"

patterns-established:
  - "Thread colour required sentinel: null = not selected (disabled), string = selected (enabled)"
  - "Variant change resets downstream state: size switch clears both tierQty and threadColour"

# Metrics
duration: 8min
completed: 2026-03-24
---

# Phase 5 Plan 03: Thread Colour Picker + Add to Cart Wiring Summary

**ProductDetailClient wired to CartContext: interactive thread colour picker (5 swatches, border-cocoa selection) + ADD_ITEM dispatch with all 9 CartItem fields, cart drawer auto-opens on add**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-24T10:00:00Z
- **Completed:** 2026-03-24T10:08:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Thread colour section upgraded from decorative Phase 4 placeholder to fully interactive picker using THREAD_COLOURS array — 5 labelled colour buttons with border-cocoa/scale-110 on selected, "Required" badge until selection made
- Add to Cart button wired: disabled/enabled via canAddToCart, dispatches ADD_ITEM with complete CartItem payload (productId, variantId, tierQty, threadColour, productName, variantName, unitPrice, imageUrl, isTool, quantity)
- Tools products (Shears) skip thread colour entirely — no picker rendered, button immediately enabled

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire thread colour picker and Add to Cart to CartContext** - `8746275` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/components/product/ProductDetailClient.tsx` - Added selectedThreadColour state, interactive THREAD_COLOURS picker, canAddToCart derived value, handleAddToCart dispatch, updated Add to Cart button

## Decisions Made

- `selectedThreadColour` initialised to `''` (empty string) for Tools, `null` for bead products — `null` serves as the disabled sentinel; avoids a separate boolean flag
- `canAddToCart = product.material === 'Tools' || selectedThreadColour !== null` — single derived boolean, no extra state
- "Required" badge is conditionally rendered inside the section heading while `selectedThreadColour === null` — disappears automatically on first selection

## Deviations from Plan

None - plan executed exactly as written. All planned functionality was already present in the working tree from prior session work; verified TypeScript compiled clean and committed.

## Issues Encountered

None - the implementation was complete before execution began (partial work from prior session). TypeScript compiled with zero errors on first check.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ProductDetailClient now dispatches ADD_ITEM with a complete CartItem on every button click — cart state accumulates correctly
- Cart drawer (next plan) should read `state.isDrawerOpen` and `state.items` from `useCart()` — drawer auto-opens on add (ADD_ITEM sets isDrawerOpen: true in reducer)
- Cart page (/cart) can read items directly from context; all fields needed for display are present in CartItem
- Thread colour label for display: `THREAD_COLOURS.find(c => c.id === item.threadColour)?.label`

---
*Phase: 05-cart-checkout*
*Completed: 2026-03-24*
