---
phase: 06-admin-panel
plan: "03"
subsystem: ui
tags: [next.js, supabase, admin, products, server-component, optimistic-ui]

requires:
  - phase: 06-01
    provides: createAdminClient() + admin auth pattern (getUser + redirect belt-and-braces)
  - phase: 03-product-catalog
    provides: products table in Supabase with is_active column (added in 06-01)

provides:
  - PATCH /api/admin/products/[id]/toggle-active — auth-guarded route to flip is_active
  - /admin/products — Server Component page, fetches all products (active + archived) via createAdminClient
  - ProductListTable — 'use client' component with real-time search, category chips, optimistic archive/restore
  - Storefront catalog filtered to is_active=true — archived products never shown to customers

affects:
  - 06-04 (product edit form links to /admin/products/{id} — Edit button already wired)
  - storefront /catalog (now Supabase-backed with is_active filter replacing mock data)

tech-stack:
  added: []
  patterns:
    - Optimistic UI for toggle — Record<id, boolean> state initialised from props, updated on PATCH success
    - Server Component data fetch + Client Component interactivity split (page.tsx fetches, ProductListTable handles state)
    - Catalog migrated from mock data to Supabase with is_active filter

key-files:
  created:
    - src/app/api/admin/products/[id]/toggle-active/route.ts
    - src/app/(admin)/admin/products/page.tsx
    - src/app/(admin)/_components/ProductListTable.tsx
  modified:
    - src/app/catalog/page.tsx

key-decisions:
  - "Catalog migrated from CATALOG_PRODUCTS mock to Supabase in this plan — is_active filter requires real DB query"
  - "Optimistic is_active state via Record<string,boolean> — immediate UI response, reverts on error via alert"
  - "loadingId state serialises concurrent archive toggles — prevents double-click race"

patterns-established:
  - "Admin page data pattern: createAdminClient() for unfiltered data; storefront createClient() with is_active=true"
  - "Optimistic toggle pattern: Record<id, value> state initialised from server props, PATCH updates local state on success"

duration: 3min
completed: 2026-03-25
---

# Phase 6 Plan 03: Product List Admin Page Summary

**Searchable/filterable admin product table with optimistic archive toggle, and storefront catalog migrated from mock data to Supabase with is_active=true filter**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-25T07:55:49Z
- **Completed:** 2026-03-25T07:59:02Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Admin can see all products (active + archived) in a searchable table at /admin/products
- Archive/Restore toggle persists to Supabase and is reflected optimistically in the UI
- Storefront /catalog now uses Supabase with `.eq('is_active', true)` — archived products invisible to customers
- Search input filters by name in real-time; category chips filter by material (Gold/Silver/Crystal/Tools)

## Task Commits

1. **Task 1: Toggle-active API route + catalog is_active filter** — `1a8415d` (feat)
2. **Task 2: Product list page + ProductListTable component** — `c659249` (feat)

**Plan metadata:** TBD (docs commit)

## Files Created/Modified

- `src/app/api/admin/products/[id]/toggle-active/route.ts` — PATCH handler; auth guard via getUser(); reads current is_active, inverts, returns new value
- `src/app/(admin)/admin/products/page.tsx` — Server Component; fetches all products via createAdminClient (no is_active filter); renders ProductListTable
- `src/app/(admin)/_components/ProductListTable.tsx` — 'use client'; search, category chips, optimistic toggle, status badges, Edit links
- `src/app/catalog/page.tsx` — Migrated from CATALOG_PRODUCTS mock to Supabase; `.eq('is_active', true)` added

## Decisions Made

- **Catalog migrated to Supabase in this plan** — The catalog page was still on mock data from Phase 3. The `is_active` filter requirement necessitated migrating to Supabase. This is aligned with the Phase 3 plan's TODO comment ("swap mock import for Supabase query").
- **Optimistic toggle via Record state** — `Record<string, boolean>` keyed by product id, initialised from server props. On PATCH success, updates locally without a full page refetch. On error, shows alert (no silent failure).
- **loadingId serialises toggles** — Only one product can be toggling at a time; the disabled button state prevents double-click issues.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Migrated catalog from mock data to Supabase**

- **Found during:** Task 1 (catalog is_active filter)
- **Issue:** `src/app/catalog/page.tsx` was still using `CATALOG_PRODUCTS` mock import. Adding `.eq('is_active', true)` requires an actual Supabase query. The plan's artifact spec requires `contains: "is_active"` and the store must show only active products.
- **Fix:** Replaced mock import with Supabase query pattern (identical to `/catalog/[slug]/page.tsx`); added `.eq('is_active', true)` and row-to-Product mapping.
- **Files modified:** `src/app/catalog/page.tsx`
- **Verification:** Build passes; TypeScript clean; catalog route becomes server-rendered (dynamic).
- **Committed in:** `1a8415d` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (missing critical — required for is_active filter to work)
**Impact on plan:** Necessary for plan objective. The mock-to-Supabase migration was always planned (Phase 3 TODO comment existed); this plan triggered it.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. All changes use existing Supabase client and auth patterns.

## Next Phase Readiness

- Edit button in ProductListTable links to `/admin/products/{id}` — ready for Plan 06-04 (product edit form)
- "New product" button links to `/admin/products/new` — ready for Plan 06-04
- Archive toggle fully functional end-to-end
- Storefront /catalog is now Supabase-backed and gated by is_active

---
*Phase: 06-admin-panel*
*Completed: 2026-03-25*
