---
phase: 05-cart-checkout
plan: 06
subsystem: api
tags: [paystack, webhook, hmac, supabase, orders, typescript, nextjs]

# Dependency graph
requires:
  - phase: 05-02-orders-schema
    provides: OrderInsert and OrderItemInsert types, orders/order_items Supabase tables
provides:
  - POST /api/webhooks/paystack route that verifies Paystack HMAC SHA512 and creates orders
  - Idempotency guard on paystack_reference
  - Middleware matcher exclusion for /api/webhooks/* paths
affects: [05-07-checkout-page, 05-08-order-confirmation, 06-admin-panel]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Raw body before JSON parse: req.text() called before JSON.parse() to preserve body for HMAC verification"
    - "Service-role Supabase client created inline: createClient with auth.persistSession=false, no cookie adapter"
    - "Await-before-return on webhook handler: handleChargeSuccess awaited before 200 response — Paystack allows 10s and 2 inserts are fast"
    - "Idempotency via maybeSingle(): query orders by paystack_reference before insert; maybeSingle returns null (not error) when no row found"

key-files:
  created:
    - src/app/api/webhooks/paystack/route.ts
  modified:
    - middleware.ts

key-decisions:
  - "Await handleChargeSuccess before returning 200 — chosen over fire-and-forget (void) because Paystack's 10s window is ample and awaiting guarantees the order is persisted before we acknowledge"
  - "maybeSingle() for idempotency check — returns null data when no row exists (unlike single() which returns error); avoids false error logging on first delivery"
  - "Service-role client created inline in handleChargeSuccess — not shared with the server.ts helper which uses cookie-based auth; service-role needs no session management"
  - "thread_colour null for isTool items — matches Phase 4 suppression decision; consistent with order_items schema where thread_colour is nullable"
  - "paystack_payload stored as JSON.parse(JSON.stringify(data)) cast — converts PaystackChargeData to Json type satisfying Supabase's Json union type"

patterns-established:
  - "Webhook route pattern: raw body text → HMAC verify → parse JSON → handle event → return 200"
  - "Middleware exclusion pattern: api/webhooks added to negative lookahead in matcher; no logic changes in middleware function body"

# Metrics
duration: 12min
completed: 2026-03-24
---

# Phase 5 Plan 06: Paystack Webhook Handler Summary

**Paystack webhook route at /api/webhooks/paystack with HMAC SHA512 verification, idempotent order creation via service-role Supabase client, and middleware exclusion for unauthenticated access**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-24T00:00:00Z
- **Completed:** 2026-03-24T00:12:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- POST /api/webhooks/paystack verifies x-paystack-signature using HMAC SHA512 over raw request body; returns 401 on missing or invalid signature
- On charge.success: idempotency guard checks paystack_reference, then inserts into orders then order_items in a single service-role session
- Middleware matcher updated to exclude /api/webhooks/* from Supabase session refresh and lowercase redirect — Paystack webhook calls bypass all auth middleware

## Task Commits

Each task was committed atomically:

1. **Task 1: Paystack webhook route handler** - `21c4c82` (feat)
2. **Task 2: Exclude webhook path from middleware auth** - `38737be` (chore)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/app/api/webhooks/paystack/route.ts` - Webhook handler: HMAC verification, charge.success handler, service-role Supabase inserts into orders and order_items
- `middleware.ts` - Added `api/webhooks` to negative lookahead in config.matcher; all existing middleware logic unchanged

## Decisions Made

- Await `handleChargeSuccess` before returning 200 rather than fire-and-forget — Paystack allows up to 10 seconds on webhook responses and two DB inserts are well within that window; awaiting guarantees the order row exists before we acknowledge receipt
- Used `maybeSingle()` for idempotency check — returns `{ data: null }` when no row found (unlike `single()` which returns an error), avoiding false error logs on every first webhook delivery
- Service-role Supabase client instantiated inline with `auth.persistSession: false` and no cookie adapter — distinct from the `@supabase/ssr` cookie-based client in `src/lib/supabase/server.ts`; service-role needs no session management
- `thread_colour` set to `null` when `item.isTool === true` — consistent with Phase 4 suppression of thread colour for Tools products and the nullable column in order_items schema
- `paystack_payload` cast via `JSON.parse(JSON.stringify(data))` — converts typed `PaystackChargeData` to Supabase's `Json` union type without losing data

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration before the webhook can write to the database:**

1. **Environment variables** — Add to `.env.local` if not already present:
   - `PAYSTACK_SECRET_KEY` — from Paystack Dashboard -> Settings -> API Keys & Webhooks -> Secret Key
   - `SUPABASE_SERVICE_ROLE_SECRET` — from Supabase Dashboard -> Project Settings -> API -> service_role secret
2. **Paystack webhook registration** — After deployment, add `https://[your-domain]/api/webhooks/paystack` in Paystack Dashboard -> Settings -> API Keys & Webhooks -> Webhooks; enable charge.success event
3. **Supabase tables** — orders and order_items tables must be created (migration in supabase/migrations/20260323_orders.sql, run via Supabase SQL editor per Plan 05-02)

## Next Phase Readiness

- Webhook handler is deployed-ready — it reads from env vars at runtime so no code changes needed when real credentials are added
- Order creation path is complete: Paystack fires webhook -> handler verifies -> order persisted -> ready for confirmation page (plan 05-07/08) to read
- `npx tsc --noEmit` passes — zero type errors across the full codebase

---
*Phase: 05-cart-checkout*
*Completed: 2026-03-24*
