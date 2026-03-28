---
phase: 08-conversion
plan: "01"
subsystem: api
tags: [supabase, postgresql, nextjs, api-route, newsletter, typescript]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Supabase client setup (createAdminClient) and Database type pattern
  - phase: 06-admin-panel
    provides: API route patterns (admin guard, JSON validation, 23505 mapping)
provides:
  - newsletter_subscribers Supabase table DDL (schema.sql Phase 8 block)
  - newsletter_subscribers TypeScript type + NewsletterSubscriber alias in supabase.ts
  - POST /api/newsletter/subscribe — public endpoint for newsletter signups
affects:
  - 08-02-newsletter-form (NewsletterForm posts to this endpoint)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Public API route (no auth guard) — any visitor can POST
    - 23505 Postgres unique violation mapped to HTTP 409
    - Email normalised to lowercase before insert for case-insensitive dedup

key-files:
  created:
    - src/app/api/newsletter/subscribe/route.ts
  modified:
    - src/lib/supabase/schema.sql
    - src/types/supabase.ts

key-decisions:
  - "newsletter_subscribers uses service-role insert only — RLS enabled with no public policies (lockout guard)"
  - "Email stored lowercase-normalised — duplicate detection is case-insensitive at DB level via unique constraint"
  - "source_page is optional — allows tracking which page/form triggered the subscription"

patterns-established:
  - "Public POST endpoint pattern: no auth guard, validate inputs, normalise, insert via createAdminClient"
  - "Duplicate handling: catch error.code === '23505' and return 409 rather than pre-checking existence"

# Metrics
duration: 4min
completed: 2026-03-28
---

# Phase 8 Plan 01: Newsletter Subscribe Data + API Layer Summary

**Supabase newsletter_subscribers table DDL, TypeScript types, and public POST /api/newsletter/subscribe endpoint with email normalisation and duplicate detection**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-28T15:25:53Z
- **Completed:** 2026-03-28T15:27:38Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Appended Phase 8 migration block to schema.sql — `newsletter_subscribers` table with RLS enabled, no public policies (service-role only)
- Added `newsletter_subscribers` Row/Insert/Update type to `Database['public']['Tables']` in supabase.ts + `NewsletterSubscriber` convenience alias
- Created public `POST /api/newsletter/subscribe` route: validates `first_name` + `email`, lowercases email, inserts via service-role, maps 23505 to 409

## Task Commits

Each task was committed atomically:

1. **Task 1: SQL migration + TypeScript types** - `a73af8c` (feat)
2. **Task 2: POST /api/newsletter/subscribe route** - `3c4c5ee` (feat)

**Plan metadata:** `[pending]` (docs: complete plan)

## Files Created/Modified

- `src/lib/supabase/schema.sql` - Phase 8 migration block appended: `newsletter_subscribers` table + RLS enable statement
- `src/types/supabase.ts` - `newsletter_subscribers` table type added inside `Tables`; `NewsletterSubscriber` alias exported at bottom
- `src/app/api/newsletter/subscribe/route.ts` - Public POST endpoint: JSON validation, first_name/email validation, lowercase normalise, insert, 23505 → 409

## Decisions Made

- **RLS lockout guard only**: No public SELECT/INSERT/UPDATE/DELETE policies on `newsletter_subscribers`. All writes go through the service-role API route. RLS acts as a safety net preventing direct client access.
- **Lowercase email normalisation**: `email.trim().toLowerCase()` before insert ensures `User@Example.com` and `user@example.com` are treated as the same subscriber by the unique constraint.
- **source_page optional**: No validation required on this field — allows callers to pass the current page path for segmentation without making it mandatory.
- **POST only**: No GET/PUT/DELETE exported — subscriber list not exposed via API; admin reads directly in Supabase Dashboard.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**Supabase table requires manual migration.** The `newsletter_subscribers` DDL was appended to `schema.sql` — run the Phase 8 block in Supabase Dashboard > SQL Editor > New query before Plan 02 (NewsletterForm) goes live.

## Next Phase Readiness

- `POST /api/newsletter/subscribe` is ready to receive requests — Plan 02 can build the NewsletterForm component and wire it to this endpoint
- Schema.sql Phase 8 block must be run in Supabase SQL Editor before end-to-end testing

---
*Phase: 08-conversion*
*Completed: 2026-03-28*
