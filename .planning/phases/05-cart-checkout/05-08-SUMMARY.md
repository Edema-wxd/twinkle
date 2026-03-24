---
phase: 05-cart-checkout
plan: 08
subsystem: ui
tags: [nextjs, supabase, realtime, typescript, orders, polling, server-components]

# Dependency graph
requires:
  - phase: 05-02-orders-schema
    provides: Order and OrderItem types, orders/order_items Supabase tables
  - phase: 05-06-webhook
    provides: Paystack webhook that inserts orders by paystack_reference
provides:
  - /orders/[reference] page: server-side fetch attempt with OrderPoller fallback
  - OrderConfirmationView: full order details UI (line items, thread colour swatches, delivery, totals)
  - OrderPoller: immediate fetch + Supabase Realtime subscription + 30s timeout with WhatsApp CTA
affects: [05-07-checkout-page, 06-admin-panel]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server Component + client island split: page.tsx attempts server-side fetch; falls back to OrderPoller (client) only when order not yet in DB"
    - "Realtime postgres_changes subscription: channel filtered by paystack_reference=eq.{ref} on orders INSERT"
    - "Follow-up fetch after Realtime: Realtime payload doesn't include nested order_items; full select re-fetched on INSERT event"
    - "unknown cast for nested Supabase select: select('*, order_items(*)') returns SelectQueryError type when Relationships: [] — cast via unknown to FullOrder"
    - "Service-role inline in Server Component: same pattern as webhook handler — no cookie adapter, persistSession false"

key-files:
  created:
    - src/app/orders/[reference]/page.tsx
    - src/app/orders/[reference]/OrderConfirmationView.tsx
    - src/app/orders/[reference]/OrderPoller.tsx
  modified: []

key-decisions:
  - "Server-first rendering: page.tsx uses service-role client server-side — customers who load the page after webhook delivery get zero client JS for the confirmation view"
  - "No notFound() for unknown reference: an unrecognised reference is a valid pending state (webhook in flight), not a 404 — OrderPoller handles it gracefully"
  - "Realtime + immediate fetch combined: immediate fetch on mount covers the race window where order arrived between page render and Realtime subscription; Realtime covers delayed webhooks"
  - "Follow-up fetch on Realtime INSERT: Realtime payload.new only contains the orders row, not nested order_items — a second select('*, order_items(*)') call on INSERT event fetches the complete FullOrder"
  - "unknown cast for nested select: manually maintained Relationships: [] in supabase.ts means TS infers SelectQueryError for order_items; cast via unknown is the documented workaround for this manual type setup"
  - "WhatsApp CTA on timeout: 30-second timeout shows reference number + WhatsApp link — actionable for customers without leaving them stranded"

patterns-established:
  - "FullOrder type alias: Order & { order_items: OrderItem[] } — used in page.tsx, OrderPoller, OrderConfirmationView; single definition per file"
  - "Thread colour display: THREAD_COLOURS lookup by id in OrderConfirmationView matches CartLineItem.tsx pattern — same swatch style"

# Metrics
duration: 13min
completed: 2026-03-24
---

# Phase 5 Plan 08: Order Confirmation Page Summary

**Order confirmation page at /orders/[reference] with server-side fetch, Supabase Realtime polling fallback, and 30-second timeout — handles both immediate and delayed webhook delivery**

## Performance

- **Duration:** ~13 min
- **Started:** 2026-03-24T10:03:42Z
- **Completed:** 2026-03-24T10:16:08Z
- **Tasks:** 2
- **Files modified:** 3 created

## Accomplishments

- /orders/[reference] Server Component attempts service-role fetch server-side; customers who arrive after webhook delivery get full confirmation with zero client JS hydration cost
- OrderPoller combines an immediate fetch on mount (race window cover) with a Supabase Realtime `postgres_changes` subscription filtered to the specific reference; triggers a follow-up fetch on INSERT to get nested order_items
- OrderConfirmationView renders: order reference, line items with thread colour swatches (matching CartLineItem style), delivery address, estimated delivery copy, subtotal/shipping/total breakdown, and Continue Shopping link
- 30-second timeout renders a "Still Processing" state with the reference number and a WhatsApp contact CTA — no blank state for delayed webhooks

## Task Commits

Each task was committed atomically:

1. **Task 1: OrderConfirmationView + OrderPoller components** - `52786d6` (feat)
2. **Task 2: Order confirmation page shell** - `b358d9a` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/app/orders/[reference]/page.tsx` - Server Component shell: async params, service-role fetch, server renders OrderConfirmationView or falls back to OrderPoller
- `src/app/orders/[reference]/OrderConfirmationView.tsx` - 'use client'; renders complete order details — items with thread colour swatches, price rows, delivery address, estimated delivery
- `src/app/orders/[reference]/OrderPoller.tsx` - 'use client'; immediate fetch + Realtime subscription + 30s timeout with WhatsApp CTA; renders OrderConfirmationView when order arrives

## Decisions Made

- Server-first rendering: service-role Supabase client used server-side in page.tsx — same inline pattern as the webhook handler (no cookie adapter, `persistSession: false`). Customers who load the page after webhook delivery see the full confirmation with no client hydration needed.
- No `notFound()` for unknown reference — an unrecognised reference is a valid pending state (webhook still in flight), not a 404. OrderPoller handles it gracefully with timeout.
- Realtime combined with immediate fetch — the immediate fetch on mount covers the race window where the order arrived between server render and client Realtime subscription setup. Realtime handles the delayed webhook case.
- Follow-up full fetch on Realtime INSERT — Realtime `payload.new` only contains the `orders` row, not the nested `order_items` relation. A second `select('*, order_items(*)')` fetches the complete FullOrder on INSERT.
- `unknown` cast for nested Supabase select — manually maintained `Relationships: []` in `supabase.ts` causes TypeScript to infer `SelectQueryError` for `order_items` in nested selects. Casting via `unknown` to `FullOrder` is the correct workaround for this manual type setup (same pattern as webhook handler).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

TypeScript error on first compile: `select('*, order_items(*)')` returns `SelectQueryError` type for `order_items` because `supabase.ts` has `Relationships: []` (no FK metadata). Fixed with `as unknown as FullOrder` cast — standard workaround for manually maintained Supabase types without CLI-generated relationships.

## User Setup Required

None - no new external service configuration required. Existing `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_SECRET`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (already required for webhook and client) are sufficient.

## Next Phase Readiness

- Order confirmation page is complete — /orders/[reference] is the destination for Paystack `onSuccess` callback in the checkout page (Plan 05-07)
- Full post-payment flow is now in place: Paystack charges → webhook inserts order → /orders/[reference] confirms
- `npm run build` passes — zero type errors, all routes build correctly
- Supabase Realtime must be enabled on the `orders` table in Supabase Dashboard for the live polling to work (standard Supabase Realtime setup)

---
*Phase: 05-cart-checkout*
*Completed: 2026-03-24*
