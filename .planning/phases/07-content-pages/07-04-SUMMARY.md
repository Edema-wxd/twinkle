---
phase: 07-content-pages
plan: "04"
subsystem: ui, api
tags: [nextjs, supabase, settings, shipping, whatsapp, server-component]

# Dependency graph
requires:
  - phase: 07-01
    provides: settings table + upsert pattern established in 07-01 admin forms
  - phase: 06-admin-panel
    provides: admin layout, SettingsForm pattern, toast pattern, auth guard pattern
provides:
  - Public /shipping page showing domestic rates, timeframes, and WhatsApp international CTA
  - /admin/shipping editor for rates, timeframes, intro copy, and WhatsApp pre-fill message
  - PUT /api/admin/shipping route (allowlisted to 6 shipping keys)
affects:
  - 07-05 (blog) — no direct dependency, but admin sidebar and pattern are shared
  - Phase 9 (SEO metadata) — /shipping page.tsx is where metadata export will live

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Settings-backed content page: public page reads specific keys from settings table with fallback defaults; admin editor scoped to those keys via allowlist API route
    - Allowlisted API route: shipping route accepts only 6 known keys — arbitrary key injection impossible

key-files:
  created:
    - src/app/shipping/page.tsx
    - src/app/(admin)/admin/shipping/page.tsx
    - src/app/(admin)/_components/ShippingForm.tsx
    - src/app/api/admin/shipping/route.ts
  modified: []

key-decisions:
  - "Shipping content stored in existing settings table under shipping_* keys — no new DB table"
  - "Allowlist in API route filters to only 6 known shipping keys — prevents arbitrary settings writes"
  - "Fallback defaults in shipping/page.tsx — page renders correctly before any settings are saved"
  - "WhatsApp number remains placeholder 2348000000000 — TODO to replace before launch (consistent with checkout)"

patterns-established:
  - "Settings-backed content page: fetch shipping_* subset of settings, merge over defaults, render"
  - "Focused admin editor: scoped ShippingForm mirrors SettingsForm pattern, PUT to dedicated route"

# Metrics
duration: 4min
completed: 2026-03-26
---

# Phase 7 Plan 4: Shipping Page Summary

**Public /shipping page with zone rate cards and WhatsApp international CTA, backed by admin editor that saves to existing settings table under shipping_* keys**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-26T09:32:35Z
- **Completed:** 2026-03-26T09:35:56Z
- **Tasks:** 2
- **Files created:** 4

## Accomplishments
- Public /shipping page renders Lagos ₦3,000 / Other states ₦4,500 in premium zone cards with timeframes, plus WhatsApp international CTA with pre-filled message
- /admin/shipping editor (ShippingForm) allows Unoma to update rates, timeframes, intro copy, and WhatsApp message without code changes
- PUT /api/admin/shipping uses key allowlist — only the 6 known shipping_* keys can ever be written; mirrors settings route pattern exactly
- Full build passes; page works with fallback defaults when settings table has no shipping rows

## Task Commits

1. **Task 1: Shipping admin editor and API route** - `8e11dda` (feat)
2. **Task 2: Public /shipping page** - `4b1db88` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/app/shipping/page.tsx` — Server Component; reads shipping_* from settings with fallback defaults; two-column zone cards + WhatsApp CTA section
- `src/app/(admin)/admin/shipping/page.tsx` — Admin Server Component; belt-and-braces auth check; fetches 6 shipping keys; passes to ShippingForm
- `src/app/(admin)/_components/ShippingForm.tsx` — 'use client' form; domestic section (rate + timeframe for Lagos and other states); international section (WhatsApp pre-fill textarea); intro copy section; toast + useTransition pattern
- `src/app/api/admin/shipping/route.ts` — PUT only; auth guard; allowlist of 6 shipping keys; upsert to settings table with onConflict: 'key'

## Decisions Made
- **No new DB table**: shipping content uses existing settings table under `shipping_*` keys — consistent with the existing flat settings approach; saves complexity
- **Key allowlist in API route**: shipping route iterates `ALLOWED_SHIPPING_KEYS` constant rather than accepting arbitrary keys from the body — prevents accidental or malicious writes to unrelated settings
- **Fallback defaults in page.tsx**: all 6 keys have hardcoded defaults so the /shipping page renders correctly on first load before any settings are configured
- **WhatsApp number stays as placeholder**: 2348000000000 used consistently (same as checkout/page.tsx TODO); to be updated before launch

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None — no new external services. WhatsApp number 2348000000000 is a placeholder; replace with real number in `src/app/shipping/page.tsx` before launch (line building `waUrl`).

## Next Phase Readiness
- /shipping page complete; ready for Plan 07-05 (blog listing page)
- No blockers

---
*Phase: 07-content-pages*
*Completed: 2026-03-26*
