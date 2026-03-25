---
phase: 06-admin-panel
plan: "07"
subsystem: admin
tags: [supabase, admin, forms, reviews, settings, api-routes, upsert]

requires:
  - phase: 06-01
    provides: createAdminClient(), admin auth guard, admin layout shell
  - phase: 06-03
    provides: products table with is_active flag; admin product list patterns

provides:
  - POST /api/admin/reviews — authenticated route that inserts review rows
  - PUT /api/admin/settings — authenticated route that upserts key-value settings
  - /admin/reviews — Server Component page with ReviewForm
  - /admin/settings — Server Component page with SettingsForm
  - ReviewForm — product picker, author, textarea, interactive star rating, toast feedback
  - SettingsForm — grouped store/contact/social fields, upserts on save

affects:
  - storefront product detail pages (reviews appear immediately after admin inserts)
  - checkout/WhatsApp integration (whatsapp_number setting can be used at runtime)
  - any storefront component that reads from settings table

tech-stack:
  added: []
  patterns:
    - Admin form pattern: 'use client' form + fetch to /api/admin/* + useTransition + 3s toast
    - Settings key-value upsert: batch array upsert with onConflict: 'key'
    - Server Component page pattern: auth check + createAdminClient() fetch + pass props to client form

key-files:
  created:
    - src/app/api/admin/reviews/route.ts
    - src/app/(admin)/admin/reviews/page.tsx
    - src/app/(admin)/_components/ReviewForm.tsx
    - src/app/api/admin/settings/route.ts
    - src/app/(admin)/admin/settings/page.tsx
    - src/app/(admin)/_components/SettingsForm.tsx
  modified: []

key-decisions:
  - "Reviews API fetches active products only — admin only adds reviews for live products"
  - "Settings upsert uses batch array (all keys in one call) not per-key requests"
  - "SettingsForm sends all fields on every save — no partial update logic; simpler and safe"
  - "Star rating uses clickable button elements with hover state (not radio inputs) — accessible + matches brand feel"

patterns-established:
  - "Admin form pattern: Server Component page fetches data, passes to 'use client' form; form POSTs/PUTs to /api/admin/*"
  - "Toast pattern: useState<{type,message}|null> + setTimeout(3000) clears — consistent across all admin forms"
  - "Settings read pattern: rows.map(r => [r.key, r.value]) → Object.fromEntries → Record<string,string> prop"

duration: 15min
completed: 2026-03-25
---

# Phase 6 Plan 07: Reviews & Settings Summary

**Admin reviews entry form (product picker, star rating, toast) and business settings form (grouped fields, key-value upsert) backed by authenticated API routes**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-25T09:00:00Z
- **Completed:** 2026-03-25T09:15:00Z
- **Tasks:** 2 (both automated)
- **Files modified:** 6 created, 0 modified

## Accomplishments

- Unoma can add customer reviews to any active product from /admin/reviews — review appears immediately on the storefront product detail page
- All business settings (store name, tagline, email, address, WhatsApp, shipping rate, social URLs) editable from /admin/settings — persisted to Supabase settings table on save
- Both forms follow the established admin pattern: Server Component data-fetching page + 'use client' form + /api/admin/* route with belt-and-braces auth check

## Task Commits

1. **Task 1: Reviews API route + review form page** — `d0c150b` (feat)
2. **Task 2: Settings API route + settings form page** — `76e3a0d` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/app/api/admin/reviews/route.ts` — POST handler: auth check, validate fields, insert into reviews table via adminClient
- `src/app/(admin)/admin/reviews/page.tsx` — Server Component; fetches active products for picker, renders ReviewForm
- `src/app/(admin)/_components/ReviewForm.tsx` — product picker select, author text input, review textarea, interactive star rating (click + hover), useTransition, 3s success/error toast
- `src/app/api/admin/settings/route.ts` — PUT handler: auth check, maps key-value pairs to array, single batch upsert with onConflict: 'key'
- `src/app/(admin)/admin/settings/page.tsx` — Server Component; fetches all settings rows, converts to Record, renders SettingsForm
- `src/app/(admin)/_components/SettingsForm.tsx` — three grouped sections (Store Details, Contact & Business, Social Links), controlled inputs, batch PUT on save, useTransition, 3s toast

## Decisions Made

- **Reviews fetches active products only** — admin should only attach reviews to products currently visible on the storefront; archived products excluded.
- **Settings upsert batched** — all field values sent together in a single PUT; server builds an array and calls `.upsert(rows, { onConflict: 'key' })` once. Simpler than per-key requests and avoids partial saves.
- **SettingsForm sends all fields on every save** — no dirty-tracking; all nine fields always included. Simple, correct, and safe for low-frequency admin usage.
- **Star rating as buttons** — interactive button elements with hover/click state instead of hidden radio inputs. More accessible (aria-label on each button) and easier to style with Tailwind.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — all changes are code-only. Settings table was seeded in Phase 06-01 (Task 1 human-action checkpoint). The admin form will update those rows.

## Next Phase Readiness

- /admin/reviews and /admin/settings are fully functional
- Phase 06 is now 7/7 plans complete
- Storefront can read `whatsapp_number` from settings table — checkout WhatsApp TODO comments can be wired in a follow-up
- Reviews appear on product detail pages immediately after insertion (no cache invalidation needed — dynamic route)

---
*Phase: 06-admin-panel*
*Completed: 2026-03-25*
