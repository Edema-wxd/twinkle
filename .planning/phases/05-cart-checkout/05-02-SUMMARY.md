---
phase: 05-cart-checkout
plan: 02
subsystem: database
tags: [supabase, postgres, sql, typescript, orders, paystack]

# Dependency graph
requires:
  - phase: 04.1-csv-price-import
    provides: PriceTier schema and variant pricing — order_items stores tier_qty and unit_price captured at purchase time
provides:
  - SQL migration DDL for orders and order_items tables (supabase/migrations/20260323_orders.sql)
  - TypeScript types: Order, OrderInsert, OrderItem, OrderItemInsert exported from src/types/supabase.ts
affects: [05-03-paystack-webhook, 05-04-order-confirmation, 06-admin-panel]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Denormalized order line items: product/variant snapshot at purchase time — history immutable even if products change"
    - "Service-role-only access pattern: no RLS on orders/order_items — all reads/writes via server-side API routes"
    - "Manual SQL migration file: run in Supabase SQL editor (consistent with project's manual approach)"

key-files:
  created:
    - supabase/migrations/20260323_orders.sql
  modified:
    - src/types/supabase.ts

key-decisions:
  - "orders and order_items have no RLS — all access via service-role API routes only (prevents direct client access to sensitive order data)"
  - "order_items is denormalized snapshot: product_name, variant_name, unit_price captured at time of order — ensures historical accuracy"
  - "thread_colour nullable on order_items to support Tools products (Shears) which have no thread colour selection"
  - "quantity CHECK constraint (1-10) in DB mirrors business rule from cart context decision"
  - "paystack_payload JSONB stores raw webhook payload for debugging and auditability"
  - "status defaults to 'paid' — first value set by webhook; admin advances through processing/shipped/delivered manually in Phase 6"

patterns-established:
  - "Order types pattern: Database['public']['Tables']['orders']['Row'] → exported as Order; same for OrderInsert, OrderItem, OrderItemInsert"
  - "Insert type pattern for orders: Omit Row minus id/created_at, add those back as optional, plus status optional (DB default)"

# Metrics
duration: 8min
completed: 2026-03-23
---

# Phase 5 Plan 02: Orders Schema Summary

**Supabase orders and order_items tables with full DDL migration file, typed TypeScript interfaces, and exported convenience types for webhook handler and confirmation page**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-23T00:00:00Z
- **Completed:** 2026-03-23T00:08:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- SQL migration file for orders (13 columns, 3 indices) and order_items (10 columns, CASCADE, quantity CHECK, 1 index)
- TypeScript Database type extended with orders and order_items following exact existing pattern (Row/Insert/Update/Relationships)
- Four convenience types exported: Order, OrderInsert, OrderItem, OrderItemInsert — ready for import in webhook route and confirmation page

## Task Commits

Each task was committed atomically:

1. **Task 1: SQL migration file for orders and order_items tables** - `f925691` (chore)
2. **Task 2: Extend supabase.ts with orders and order_items types** - `442ca93` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `supabase/migrations/20260323_orders.sql` - DDL for orders and order_items tables; run manually in Supabase SQL editor
- `src/types/supabase.ts` - Extended with orders and order_items table types; exports Order, OrderInsert, OrderItem, OrderItemInsert

## Decisions Made

- `orders` and `order_items` have no RLS — service-role access only, consistent with existing `reviews` table pattern for write-protected data
- `order_items` stores a denormalized product snapshot (product_name, variant_name, unit_price, tier_qty) so order history is immutable even if the products table changes
- `thread_colour` is nullable on `order_items` to accommodate Tools products (Shears) which have no thread colour selection per Phase 4 decision
- `quantity` has a DB-level CHECK constraint (1–10) mirroring the cart context rule — enforced at both application and database layers
- `status` column defaults to `'paid'` in SQL — the webhook always sets this explicitly but the default ensures consistency
- `paystack_payload JSONB` stores the full raw webhook payload for auditability and debugging

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration:**

1. **Supabase SQL editor** — Run `supabase/migrations/20260323_orders.sql` in the Supabase Dashboard SQL editor to create the orders and order_items tables
2. **Supabase Realtime** — Enable replication for the `orders` table (Dashboard -> Database -> Replication -> Source -> Select orders table) — used by the order confirmation page poller
3. **Environment variables** — Add to `.env.local`:
   - `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` — from Paystack Dashboard -> Settings -> API Keys & Webhooks -> Public Key
   - `PAYSTACK_SECRET_KEY` — from Paystack Dashboard -> Settings -> API Keys & Webhooks -> Secret Key
   - `SUPABASE_SERVICE_ROLE_SECRET` — from Supabase Dashboard -> Project Settings -> API -> service_role secret
4. **Paystack webhook** — After deployment, add webhook endpoint `https://[your-domain]/api/webhooks/paystack` in Paystack Dashboard -> Settings -> API Keys & Webhooks -> Webhooks

## Next Phase Readiness

- SQL migration is committed and ready to run in Supabase dashboard
- `Order`, `OrderInsert`, `OrderItem`, `OrderItemInsert` types are importable from `@/types/supabase` — webhook route (plan 05-03) and confirmation page (plan 05-04) can use them immediately
- `npx tsc --noEmit` passes — zero type errors
- Blocker: Supabase SQL migration must be run and env vars added before webhook handler can write orders to the database

---
*Phase: 05-cart-checkout*
*Completed: 2026-03-23*
