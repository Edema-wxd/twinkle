---
phase: 07-content-pages
plan: "03"
subsystem: ui
tags: [accordion, faq, supabase, admin-crud, nextjs, tailwind]

# Dependency graph
requires:
  - phase: 07-01
    provides: Supabase faqs table DDL + types (Faq, FaqInsert) in supabase.ts
  - phase: 06
    provides: admin auth pattern, FaqForm toast pattern, createAdminClient, AdminSidebar with FAQs link
provides:
  - Public /faq page with grouped accordion (one-open-at-a-time)
  - FaqAccordion.tsx — use client leaf island, CSS grid height animation
  - /admin/faqs list + create page (Server Component)
  - /admin/faqs/[id] edit/delete page (Server Component)
  - FaqForm.tsx — dual-mode create/edit, inline delete confirm, toast
  - POST /api/admin/faqs — auth guard + validation, 201 on success
  - PUT /api/admin/faqs/[id] — partial update, 404 guard
  - DELETE /api/admin/faqs/[id] — 404 guard
affects: [07-04, 07-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - CSS grid-rows-[0fr/1fr] height animation (no JS measurement)
    - FaqForm dual-mode pattern (create vs edit via optional faq prop)
    - Grouped accordion via reduce<Record<string, Faq[]>>

key-files:
  created:
    - src/app/faq/page.tsx
    - src/components/faq/FaqAccordion.tsx
    - src/app/(admin)/admin/faqs/page.tsx
    - src/app/(admin)/admin/faqs/[id]/page.tsx
    - src/app/(admin)/_components/FaqForm.tsx
    - src/app/api/admin/faqs/route.ts
    - src/app/api/admin/faqs/[id]/route.ts
  modified: []

key-decisions:
  - "CSS grid accordion animation: grid-rows-[0fr/1fr] with overflow-hidden — no JS height measurement, pure CSS transition"
  - "FaqAccordion as use client leaf island: /faq page.tsx remains Server Component, passes faqs as props"
  - "Admin FAQ list groups by category inline: reduce on server-fetched array before passing to JSX"

patterns-established:
  - "FaqForm dual-mode: optional faq prop drives create vs edit — same component, same fetch pattern"
  - "Admin edit page: Server Component fetches with createAdminClient + result pattern, renders form"
  - "Public content pages: Server Component fetches with public createClient, empty array fallback"

# Metrics
duration: 15min
completed: 2026-03-26
---

# Phase 7 Plan 3: FAQ Page Summary

**Accordion /faq page grouped by category + admin CRUD for Unoma to manage FAQ content without code changes**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-26T12:26:40Z
- **Completed:** 2026-03-26T12:41:00Z
- **Tasks:** 2
- **Files modified:** 7 created

## Accomplishments

- Public /faq page renders FAQs from Supabase grouped by category; one-open-at-a-time accordion with CSS grid height animation
- Admin CRUD at /admin/faqs (list + create) and /admin/faqs/[id] (edit + delete) — FaqForm handles both modes
- REST API routes POST/PUT/DELETE with auth guards, input validation, and 404 guards

## Task Commits

1. **Task 1: FAQ admin CRUD** — `a2e2be2` (feat)
2. **Task 2: Public /faq page with accordion** — `0ce3f98` (feat)

## Files Created/Modified

- `src/app/faq/page.tsx` — Server Component, public Supabase client, passes faqs array to FaqAccordion
- `src/components/faq/FaqAccordion.tsx` — use client, groups by category, one-open-at-a-time, CSS grid animation
- `src/app/(admin)/admin/faqs/page.tsx` — Server Component list + create form, grouped by category
- `src/app/(admin)/admin/faqs/[id]/page.tsx` — Server Component edit page, notFound() on missing row
- `src/app/(admin)/_components/FaqForm.tsx` — dual-mode form (create/edit), inline delete confirm, toast pattern
- `src/app/api/admin/faqs/route.ts` — POST with auth guard, validation, returns `{ faq }` on 201
- `src/app/api/admin/faqs/[id]/route.ts` — PUT partial update + DELETE, both with auth guard and 404 check

## Decisions Made

- **CSS grid accordion animation** — used `grid-rows-[0fr]` / `grid-rows-[1fr]` with `overflow-hidden transition-all` to animate height without any JS measurement. Specified in CONTEXT.md, works natively with Tailwind v4.
- **FaqAccordion as leaf island** — `'use client'` on FaqAccordion only; page.tsx stays a Server Component and passes data as props. Consistent with established client island pattern across the codebase.
- **Admin list groups server-side** — `reduce` runs on the server-fetched array in the Server Component before rendering JSX. No client-side grouping needed.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. The `faqs` Supabase table DDL was documented in 07-01-SUMMARY.md.

## Next Phase Readiness

- /faq page is live and functional once FAQs are added via admin
- /admin/faqs sidebar link was already present (from phase 06 AdminSidebar planning)
- Ready for 07-04 (blog) and 07-05 (shipping info) which follow the same content page + admin CRUD pattern

---
*Phase: 07-content-pages*
*Completed: 2026-03-26*
