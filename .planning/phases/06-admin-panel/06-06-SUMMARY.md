---
phase: 06-admin-panel
plan: "06"
subsystem: ui
tags: [next.js, supabase, admin, orders, status, server-components, optimistic-ui]

requires:
  - phase: 06-admin-panel/06-01
    provides: createAdminClient(), admin auth shell, belt-and-braces getUser() pattern
  - phase: 05-cart-checkout
    provides: orders + order_items tables with full schema including customer_name, delivery_address, thread_colour

provides:
  - PATCH /api/admin/orders/[id] — auth-guarded status update with validation
  - /admin/orders — filterable orders list with inline status update per row
  - /admin/orders/[id] — full order detail with customer info, WhatsApp link, line items table
  - OrdersTable component — status tab filter (All/Paid/Processing/Shipped/Delivered) with counts
  - OrderStatusSelect component — optimistic inline dropdown with spinner + error revert

affects:
  - 06-07 (final admin phase — may cross-reference orders from settings or reviews)

tech-stack:
  added: []
  patterns:
    - Optimistic status update: local useState mirrors server state; reverts on API error
    - FullOrder cast pattern: `result.data as unknown as FullOrder` to work around Supabase manual type Relationships
    - Inline status dropdown with save spinner: disabled during PATCH, spinner sibling of select

key-files:
  created:
    - src/app/api/admin/orders/[id]/route.ts
    - src/app/(admin)/admin/orders/page.tsx
    - src/app/(admin)/admin/orders/[id]/page.tsx
    - src/app/(admin)/_components/OrdersTable.tsx
    - src/app/(admin)/_components/OrderStatusSelect.tsx
  modified: []

key-decisions:
  - "OrderStatusSelect optimistic update: status state initialised from prop, reverts to previous on API error — no page reload needed"
  - "PATCH route validates against fixed list: paid/processing/shipped/delivered — returns 400 with helpful message on invalid status"
  - "FullOrder cast via unknown: same pattern as Phase 5 order confirmation — manual supabase.ts Relationships: [] workaround"
  - "tfoot colSpan=5 (not dual hidden/visible cells): simpler than CSS breakpoint tricks; all 6 DOM columns always present"
  - "WhatsApp link on detail page: href=wa.me/{phone} strips non-digits — tappable on mobile"

patterns-established:
  - "Admin detail page pattern: auth guard + adminClient fetch + notFound() + two-section layout (customer info / line items)"
  - "Status tab filter: useMemo filters orders array; countForTab() computes badge counts from full orders array"

duration: 6min
completed: 2026-03-25
---

# Phase 6 Plan 06: Admin Orders Summary

**Filterable orders list with inline status dropdown and full order detail page (customer address, WhatsApp, line items) backed by PATCH API route**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-25T16:39:22Z
- **Completed:** 2026-03-25T16:45:04Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- /admin/orders shows all orders with status tab filter (All / Paid / Processing / Shipped / Delivered with live counts)
- Inline OrderStatusSelect: optimistic update with spinner, auto-reverts to previous status on API error
- /admin/orders/[id] shows full customer delivery info, clickable WhatsApp link, and line-item breakdown with subtotal + shipping + grand total
- PATCH /api/admin/orders/[id] validates status value, checks auth, returns 400/401/404/500 appropriately

## Task Commits

1. **Task 1: Order status PATCH API route** — `4ab1b86` (feat)
2. **Task 2: Orders list + status select + order detail page** — `3df3765` (feat)

**Plan metadata:** TBD (docs commit)

## Files Created/Modified

- `src/app/api/admin/orders/[id]/route.ts` — PATCH route: auth + status validation + Supabase update
- `src/app/(admin)/admin/orders/page.tsx` — Server Component list; fetches all orders from adminClient
- `src/app/(admin)/admin/orders/[id]/page.tsx` — Server Component detail: customer card + line items table with footer totals
- `src/app/(admin)/_components/OrdersTable.tsx` — 'use client'; status tab filter bar + responsive table with Order # link
- `src/app/(admin)/_components/OrderStatusSelect.tsx` — 'use client'; inline dropdown with optimistic update, spinner, and error revert

## Decisions Made

- **OrderStatusSelect optimistic pattern** — Status state initialised from `currentStatus` prop; on API error the previous value is captured before setState and restored via `setStatus(previous)`. No page reload needed for either success or failure path.
- **PATCH validates against const array** — `VALID_STATUSES = ['paid', 'processing', 'shipped', 'delivered']`; returns 400 with enumeration message to help caller debug wrong values.
- **FullOrder cast via unknown** — `result.data as unknown as FullOrder` is the established pattern for manual supabase.ts where Relationships: [] prevents direct typed select return.
- **tfoot colSpan=5** — Initial implementation used dual `hidden`/`md:hidden` cells per row to show different labels at breakpoints, but since all 6 DOM columns are always present the simple `colSpan={5}` approach works at all breakpoints without layout artifacts.
- **WhatsApp click-to-chat** — `href=wa.me/` with `phone.replace(/\D/g, '')` strips any spaces or dashes in stored phone numbers for valid URL.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed tfoot colspan layout artifact**

- **Found during:** Task 2 (order detail page)
- **Issue:** Initial tfoot used `hidden md:table-cell` + `md:hidden` dual cells per row to vary label text, but both cells are in DOM simultaneously — browser counts both for column spanning, causing misaligned footer
- **Fix:** Replaced with single `colSpan={5}` label cell covering all non-value columns; works across all breakpoints without duplication
- **Files modified:** `src/app/(admin)/admin/orders/[id]/page.tsx`
- **Verification:** Build passes; tfoot renders correctly
- **Committed in:** `3df3765` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug)
**Impact on plan:** Layout correctness fix. No scope creep.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. All routes use existing Supabase credentials and admin auth already established in Plan 06-01.

## Next Phase Readiness

- Orders section fully functional — admin can view, filter, and advance all orders
- OrderStatusSelect is reusable — could be placed in any context where an order ID and current status are available
- Remaining Phase 6 plans: 06-07 (final plan — likely settings or phase wrap-up)

---
*Phase: 06-admin-panel*
*Completed: 2026-03-25*
