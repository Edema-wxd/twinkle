---
phase: 06-admin-panel
plan: "01"
subsystem: auth
tags: [supabase, auth, middleware, next-auth, server-actions, admin]

requires:
  - phase: 05-cart-checkout
    provides: orders/order_items tables + service-role webhook pattern already established
  - phase: 03-product-catalog
    provides: Supabase products table that now gets is_active column

provides:
  - createAdminClient() — service-role Supabase client (server-only)
  - Admin route guard in middleware.ts (getUser() validates against auth server)
  - /admin/login — login form with inline error display
  - loginAction / logoutAction — cookie-based server actions
  - AdminSidebar — fixed desktop + mobile drawer with active-link detection
  - /admin layout shell — isolated from storefront (no CartProvider/Header/Footer)
  - /admin stub dashboard page — placeholder for Plan 06-02

affects:
  - 06-02 through 06-07 (all admin plans build on this auth + layout foundation)

tech-stack:
  added: []
  patterns:
    - Belt-and-braces auth — both middleware getUser() AND layout.tsx getUser() check (CVE-2025-29927)
    - Admin route group (admin) — isolated layout, no storefront shell components
    - Server actions for auth — loginAction/logoutAction use cookie-based createClient() not admin client
    - useTransition for async server action calls in login form

key-files:
  created:
    - src/lib/supabase/admin.ts
    - src/app/(admin)/layout.tsx
    - src/app/(admin)/admin/login/actions.ts
    - src/app/(admin)/admin/login/page.tsx
    - src/app/(admin)/_components/AdminSidebar.tsx
    - src/app/(admin)/admin/page.tsx
  modified:
    - middleware.ts
    - src/types/supabase.ts

key-decisions:
  - "getUser() in middleware (not getClaims) for admin guard — validates against auth server, not just local JWT"
  - "Double auth check: middleware guard + per-page layout check (belt and braces per CVE-2025-29927)"
  - "loginAction uses cookie-based createClient, NOT createAdminClient — auth sessions are user-scoped"
  - "Admin route group (admin) has its own layout.tsx that never imports CartProvider/Header/Footer"
  - "AdminSidebar handles mobile drawer internally via useState — no shared mobile nav context needed"

patterns-established:
  - "Admin auth pattern: createClient().auth.getUser() in both middleware AND layout.tsx"
  - "Server action auth pattern: createClient() + signInWithPassword/signOut + redirect()"
  - "Admin page auth pattern: getUser() check + redirect at top of every Server Component page"

duration: 18min
completed: 2026-03-25
---

# Phase 6 Plan 01: Admin Foundation Summary

**Supabase admin auth shell with cookie-based login/logout, middleware guard (getUser), belt-and-braces per-page checks, and isolated admin sidebar layout**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-25T07:38:43Z
- **Completed:** 2026-03-25T07:56:00Z
- **Tasks:** 3 (Task 1 completed by user; Tasks 2-3 automated)
- **Files modified:** 8

## Accomplishments

- Protected /admin shell: unauthenticated visits redirect to /admin/login via middleware getUser() guard
- Login form with useTransition + inline error display, brand gold styling
- Admin layout shell completely isolated from storefront — no CartProvider, Header, Footer
- Supabase type additions: is_active on products.Row + settings table with key/value shape

## Task Commits

1. **Task 1: Supabase setup** — human-action checkpoint (user completed in dashboard)
2. **Task 2: Admin Supabase client + type additions** — `a4ce19c` (feat)
3. **Task 3: Middleware guard + login/logout + admin layout** — `77916bd` (feat)

**Plan metadata:** TBD (docs commit)

## Files Created/Modified

- `src/lib/supabase/admin.ts` — createAdminClient() using SUPABASE_SERVICE_ROLE_KEY, server-only
- `src/types/supabase.ts` — added is_active to products.Row, settings table, Product + Setting types
- `middleware.ts` — Steps 3+4: admin route guard + authenticated user redirected away from login
- `src/app/(admin)/admin/login/actions.ts` — loginAction (signInWithPassword) + logoutAction (signOut)
- `src/app/(admin)/admin/login/page.tsx` — 'use client' login form with useTransition, inline errors
- `src/app/(admin)/_components/AdminSidebar.tsx` — desktop fixed + mobile hamburger drawer, active-link detection
- `src/app/(admin)/layout.tsx` — Server Component admin shell, independent getUser() check, no storefront
- `src/app/(admin)/admin/page.tsx` — stub dashboard, replaced by Plan 06-02

## Decisions Made

- **getUser() not getClaims() for admin guard** — middleware documentation recommends getUser() for auth-critical paths (CVE-2025-29927); getClaims is fine for session refresh but not for authorization gates.
- **Double auth check** — middleware can be bypassed in some edge deployments; per-page check in layout.tsx + individual page.tsx is belt-and-braces insurance.
- **loginAction uses cookie client, not admin client** — auth sessions are user-scoped (cookies); the service-role admin client is for data operations only, never for auth flows.
- **AdminSidebar owns mobile state** — drawer open/close managed internally via useState; no global context needed at this stage.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

Task 1 was a human-action checkpoint. The user completed:
- Created admin user in Supabase Dashboard (UUID: 79d59fc7-622b-4b09-a80a-a06bfe327175)
- Created product-images storage bucket (public, with RLS policies)
- Ran SQL migrations: is_active column on products, settings table + 9 seed rows

## Next Phase Readiness

- Auth foundation complete; /admin/login and /admin routes functional
- All 06-02 through 06-07 plans can build on this foundation
- Admin Supabase client (createAdminClient) ready for product CRUD, order management, etc.
- AdminSidebar already has nav links for Products, Orders, Reviews, Settings — shells needed in later plans

---
*Phase: 06-admin-panel*
*Completed: 2026-03-25*
