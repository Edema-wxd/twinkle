---
phase: 05-cart-checkout
plan: 07
subsystem: payments
tags: [paystack, checkout, shipping, forms, react, nextjs]

# Dependency graph
requires:
  - phase: 05-01
    provides: CartContext, useCart hook, CartItem type, CLEAR_CART dispatch
  - phase: 05-05
    provides: /orders/[reference] page for post-payment navigation
provides:
  - Two-step checkout flow at /checkout
  - Shipping zone logic (Lagos ₦3k / others ₦4.5k)
  - NIGERIAN_STATES constant (37 entries)
  - CheckoutForm with validation and Nigeria/International toggle
  - OrderReview with line items, price breakdown, customer summary
  - PaystackButton with dynamic @paystack/inline-js import
  - International WhatsApp CTA path
affects:
  - Phase 6 (admin/fulfilment)
  - Any future analytics requiring checkout funnel tracking

# Tech tracking
tech-stack:
  added:
    - "@paystack/inline-js (runtime)"
    - "@types/paystack__inline-js (devDependency)"
  patterns:
    - "Dynamic import inside click handler for browser-only SDK (Paystack popup)"
    - "Stable reference generated in useState initialiser (not useEffect) to avoid re-generation"
    - "State-driven two-step form: step 1|2 + isInternational flag"

key-files:
  created:
    - src/lib/checkout/shipping.ts
    - src/components/checkout/CheckoutForm.tsx
    - src/components/checkout/PaystackButton.tsx
    - src/components/checkout/OrderReview.tsx
    - src/app/checkout/page.tsx
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Paystack dynamic import: const PaystackPop = (await import('@paystack/inline-js')).default inside click handler — avoids SSR crash, no module-level import"
  - "metadata cast as any: @types restricts to custom_fields[] but runtime accepts arbitrary objects; cast needed to pass cart+shipping data"
  - "WhatsApp number placeholder: 2348000000000 with TODO comment — real number added by owner before launch"
  - "reference stable via useState initialiser not useEffect — reference never changes across re-renders, avoids useState(undefined) on first render"
  - "International path handled entirely in checkout page, not routed to different page — simpler state machine"

patterns-established:
  - "Paystack dynamic import pattern: import inside async click handler, not at module level"
  - "Shipping zone as pure function + constant: testable, importable, no side effects"

# Metrics
duration: 15min
completed: 2026-03-24
---

# Phase 5 Plan 7: Two-Step Checkout Flow Summary

**Two-step checkout with state-driven shipping zones (Lagos ₦3k/others ₦4.5k), Paystack popup via dynamic import, and WhatsApp fallback for international orders**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-24T00:00:00Z
- **Completed:** 2026-03-24T00:15:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Full /checkout page with step indicator, Step 1 (customer details + address + state), Step 2 (order review + pay)
- Shipping logic: Lagos ₦3,000 / all other states ₦4,500, driven by NIGERIAN_STATES dropdown (37 states)
- Paystack popup integration using dynamic import inside click handler (avoids SSR crash)
- International toggle shows WhatsApp CTA and skips Paystack entirely
- onSuccess: dispatches CLEAR_CART + router.push('/orders/[reference]'); onCancel: error banner without clearing cart

## Task Commits

1. **Task 1: Shipping logic + CheckoutForm (Step 1)** - `6bef9d0` (feat)
2. **Task 2: PaystackButton + OrderReview + checkout page** - `79eb006` (feat)

## Files Created/Modified

- `src/lib/checkout/shipping.ts` - NIGERIAN_STATES constant (37), getShippingCost pure function
- `src/components/checkout/CheckoutForm.tsx` - Step 1 form: all fields, inline validation, Nigeria/International toggle
- `src/components/checkout/PaystackButton.tsx` - Dynamic @paystack/inline-js import, NGN popup trigger
- `src/components/checkout/OrderReview.tsx` - Step 2: line items, subtotal+shipping+total, customer summary, error banner
- `src/app/checkout/page.tsx` - Two-step orchestrator with step indicator and empty-cart redirect
- `package.json` / `package-lock.json` - Added @paystack/inline-js + @types

## Decisions Made

- **Paystack dynamic import inside click handler** — `const PaystackPop = (await import('@paystack/inline-js')).default` inside `handlePay`. The SDK manipulates `window` and `document` at import time; a module-level import would crash Next.js SSR. Dynamic import inside a click event is browser-only, guaranteed safe.
- **metadata cast as `any`** — The `@types/paystack__inline-js` metadata type is overly restrictive (only `custom_fields[]`). The actual Paystack SDK accepts arbitrary JSON at runtime. Cast applied with a comment explaining why.
- **WhatsApp placeholder number** — Using `2348000000000` with a TODO comment. Actual business number to be wired before launch.
- **reference via useState initialiser** — `useState(() => 'TW-' + Date.now() + ...)` generates reference once on component mount. This is stable across re-renders. Using useEffect would leave reference undefined on first render.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

Before checkout is live, the following must be done:

1. Set `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` in `.env.local` (and production env) to the live Paystack public key
2. Replace the WhatsApp placeholder number (`2348000000000`) in two places:
   - `src/components/checkout/CheckoutForm.tsx` (line with TODO comment)
   - `src/app/checkout/page.tsx` (line with TODO comment)
3. Verify the Paystack webhook secret in `.env.local` matches the configured webhook in Paystack dashboard (already done in 05-06)

## Next Phase Readiness

- /checkout → /orders/[reference] navigation path is complete end-to-end
- Cart clears on successful payment
- Webhook (05-06) persists the order in Supabase before the /orders page loads
- Phase 6 (admin/fulfillment) can now pick up orders from the `orders` table
- No blockers for Phase 6

---
*Phase: 05-cart-checkout*
*Completed: 2026-03-24*
