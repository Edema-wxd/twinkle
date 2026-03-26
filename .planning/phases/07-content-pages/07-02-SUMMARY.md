---
phase: 07-content-pages
plan: "02"
subsystem: ui
tags: [nextjs, supabase, tiptap, intersection-observer, react, admin]

# Dependency graph
requires:
  - phase: 07-01
    provides: AboutSection Supabase type; AdminSidebar Content nav with /admin/pages link
  - phase: 06-admin-panel
    provides: RichTextEditor, SettingsForm pattern, admin shell layout, auth guard pattern
provides:
  - Public /about page with four sections fetched from about_sections Supabase table
  - AboutStickyNav client island with IntersectionObserver active section highlight
  - AboutSection server component rendering Tiptap HTML safely with custom [&_tag] selectors
  - /admin/pages editor with Tiptap + single-image upload per section
  - PUT /api/admin/pages upserts all four about_sections rows
affects:
  - 07-03-faqs
  - 07-04-blog
  - 07-05-shipping

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "IntersectionObserver sticky nav: rootMargin -30%/0%/-60%/0% prevents scroll jank; each section observed independently"
    - "Accordion admin section: collapsible cards expanded by default; toggle by section ID key in Record<string,boolean>"
    - "Single-image upload pattern: createBrowserClient() + content-images bucket + about/{id}/{timestamp}-{filename}"
    - "Fallback content pattern: page.tsx returns placeholder sections if DB empty, never crashes"

key-files:
  created:
    - src/app/about/page.tsx
    - src/components/about/AboutStickyNav.tsx
    - src/components/about/AboutSection.tsx
    - src/app/(admin)/admin/pages/page.tsx
    - src/app/(admin)/_components/AboutPagesForm.tsx
    - src/app/api/admin/pages/route.ts
  modified: []

key-decisions:
  - "AboutStickyNav reads DOM directly via getElementById — no props from page.tsx; page remains a Server Component"
  - "AboutSection uses [&_tag]: Tailwind selectors not prose — @tailwindcss/typography not installed"
  - "API route includes display_order in upsert rows — required field on Insert type; defaults to array index"
  - "content-images bucket for about section images — separate from product-images bucket used by product admin"
  - "scroll-mt-20 on section elements ensures sticky nav does not obscure headings after smooth scroll"

patterns-established:
  - "Accordion section editor: each content section gets collapsible card with title/body/image in admin forms"
  - "Single image upload: label wrapping hidden file input + image preview + remove button — simpler than full ImageUploader for single-slot use"
  - "Fallback sections array: page.tsx defines DEFAULT_SECTIONS constant for fresh installs before DB seeded"

# Metrics
duration: 4min
completed: 2026-03-26
---

# Phase 7 Plan 02: About Page and Admin Pages Editor Summary

**Public /about page with IntersectionObserver sticky pill nav and four Supabase-driven sections; /admin/pages editor with Tiptap and per-section image upload**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-26T12:20:32Z
- **Completed:** 2026-03-26T12:24:16Z
- **Tasks:** 2
- **Files created:** 6

## Accomplishments
- /about page fetches four sections from about_sections Supabase table, renders with branded typography using custom Tailwind [&_tag] selectors; gracefully falls back to placeholder copy when DB is empty
- AboutStickyNav client island uses IntersectionObserver with rootMargin `-30% 0px -60% 0px` — active pill turns gold, no scroll jank; nav stays above content with sticky top-4
- Contact section automatically renders a WhatsApp CTA button with green pill styling
- /admin/pages editor: four collapsible accordion cards each with title text input + Tiptap RichTextEditor + single image upload to content-images bucket; single Save button PUT /api/admin/pages upserts all rows
- Build passes with zero TypeScript errors; no prose class used; no window.location at render time

## Task Commits

Each task was committed atomically:

1. **Task 1: /admin/pages editor (admin page + form + API route)** - `bc8d983` (feat)
2. **Task 2: Public /about page with sticky pill nav** - `660bb7d` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified
- `src/app/about/page.tsx` - Server Component; fetches about_sections; renders AboutStickyNav + AboutSection list
- `src/components/about/AboutStickyNav.tsx` - Client island; IntersectionObserver sticky pill nav
- `src/components/about/AboutSection.tsx` - Server Component; renders section with title, image, Tiptap HTML body, WhatsApp CTA for contact section
- `src/app/(admin)/admin/pages/page.tsx` - Admin Server Component; auth guard; fetches sections; passes to AboutPagesForm; seeds defaults if empty
- `src/app/(admin)/_components/AboutPagesForm.tsx` - Client form; accordion editors; image upload to content-images bucket; PUT save
- `src/app/api/admin/pages/route.ts` - PUT handler; auth guard; validates sections array; upserts about_sections via admin client

## Decisions Made
- API route defaults `display_order` to the section's array index when not provided — keeps the Insert type satisfied without requiring the form to track ordering.
- Single image upload pattern (label wrapping hidden input) used instead of the full drag-sortable ImageUploader — about sections only need one image each and drag-reorder adds unnecessary complexity.
- `scroll-mt-20` added to section elements so the sticky nav does not overlap headings after smooth scroll.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added display_order to API route upsert payload**
- **Found during:** Task 1 (API route)
- **Issue:** `SectionPayload` type didn't include `display_order`, causing a TypeScript overload error — the about_sections Insert type requires it
- **Fix:** Added `display_order?: number` to SectionPayload and mapped it to array index as fallback in the insert rows
- **Files modified:** src/app/api/admin/pages/route.ts
- **Verification:** `npx tsc --noEmit` exits 0 after fix
- **Committed in:** bc8d983 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — missing required field in upsert payload)
**Impact on plan:** Necessary for TypeScript correctness and runtime correctness. No scope creep.

## Issues Encountered
None.

## User Setup Required
- Create `content-images` Supabase storage bucket with public read access before image uploads will succeed. If the bucket does not exist, the image upload shows an error toast rather than crashing.
- Ensure `about_sections` table is created in Supabase using the DDL comment in `src/types/supabase.ts` (added in 07-01).

## Next Phase Readiness
- /about page is live and renders from Supabase; content editable from /admin/pages
- Pattern for public content page + admin editor established — reusable for FAQs (07-03), Blog (07-04), Shipping Info (07-05)
- No blockers for Wave 2 plans

---
*Phase: 07-content-pages*
*Completed: 2026-03-26*
