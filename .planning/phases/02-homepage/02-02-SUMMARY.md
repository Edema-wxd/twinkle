---
phase: 02-homepage
plan: 02
subsystem: ui
tags: [nextjs, react, tailwind, server-components, homepage, hero, brand-story, instagram]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Tailwind v4 config with brand colours and typography, layout wrapper, next/font setup

provides:
  - HeroSection — full-viewport gradient hero with Halimun headline and dual CTA buttons
  - BrandStorySection — text/image split layout with /about link and TODO placeholders
  - InstagramCTASection — full-width cocoa background brand moment with external Instagram link

affects:
  - 02-homepage plan 01 (page.tsx assembly — these components are imported there)
  - 07-about (BrandStorySection /about link becomes active)
  - Any plan that composes the homepage

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server Component pattern: no use client directive; pure static JSX with Tailwind classes
    - Tailwind v4 gradient syntax: bg-linear-to-br (NOT bg-gradient-to-br which is v3)
    - TODO comment convention: {/* TODO: Replace with real X from Y */} for placeholder content

key-files:
  created:
    - src/components/home/HeroSection.tsx
    - src/components/home/BrandStorySection.tsx
    - src/components/home/InstagramCTASection.tsx
  modified: []

key-decisions:
  - "Server Components only — none of the three sections need interactivity"
  - "BrandStorySection image placeholder uses styled div (not next/image) — no real photo exists yet"
  - "InstagramCTASection uses regular anchor (not next/link) for external URL — correct per Next.js conventions"
  - "WhatsApp number left as placeholder (wa.me/2348000000000) with TODO for NEXT_PUBLIC_WHATSAPP_NUMBER env var"

patterns-established:
  - "Brand section gradient: bg-linear-to-br from-cocoa via-cocoa/80 to-gold/20"
  - "Split layout grid: grid-cols-1 lg:grid-cols-2 gap-12 items-center"
  - "External link safety: target=_blank + rel=noopener noreferrer"
  - "Image placeholder: aspect-square bg-linear-to-br from-gold/20 with Halimun wordmark watermark"

# Metrics
duration: 2min
completed: 2026-03-20
---

# Phase 2 Plan 02: Homepage Static Sections Summary

**Three pure Server Component homepage sections: HeroSection with Tailwind v4 gradient and dual CTA, BrandStorySection with text/image split layout, InstagramCTASection with full-width cocoa brand moment**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-20T07:59:38Z
- **Completed:** 2026-03-20T08:01:48Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- HeroSection renders full-viewport gradient with Halimun "Adorn Your Locs" headline, "Explore Beads" CTA to /catalog, and WhatsApp secondary link
- BrandStorySection delivers text/image split with 3 TODO placeholders (2 copy, 1 photo) and /about link ready for Phase 7
- InstagramCTASection creates a distinct brand moment in bg-cocoa with correct external link semantics

## Task Commits

Each task was committed atomically:

1. **Task 1: HeroSection — gradient hero with CTAs** - `14d6651` (feat)
2. **Task 2: BrandStorySection and InstagramCTASection** - `fffcc73` (feat)

**Plan metadata:** _(to be added by final commit)_ (docs: complete plan)

## Files Created/Modified

- `src/components/home/HeroSection.tsx` — Full-viewport hero section, Tailwind v4 gradient, dual CTA
- `src/components/home/BrandStorySection.tsx` — Text/image split, TODO placeholders, /about link
- `src/components/home/InstagramCTASection.tsx` — Brand moment section, external Instagram link

## Decisions Made

- Used `bg-linear-to-br` (Tailwind v4) not `bg-gradient-to-br` (v3) — consistent with globals.css @theme approach
- BrandStorySection image column uses a styled `div` placeholder (not `next/image`) because no real photograph exists yet; includes a `{/* TODO */}` comment
- InstagramCTASection uses a plain `<a>` tag (not `Link`) for the external Instagram URL — correct per Next.js conventions; `Link` is for internal navigation
- WhatsApp number kept as placeholder `wa.me/2348000000000` with TODO comment pointing to `NEXT_PUBLIC_WHATSAPP_NUMBER` env var

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All three sections are ready to import into `src/app/page.tsx` (handled in Plan 02-01 or page assembly plan)
- `/about` link in BrandStorySection is a forward-reference — it will 404 until Phase 7 builds that page
- WhatsApp number needs replacing with real number before launch — TODO comment in HeroSection marks the location
- Real brand story copy from Unoma needed to replace placeholder text — 2 TODO comments in BrandStorySection
- Real brand story photo needed — 1 TODO comment in BrandStorySection image placeholder

---
*Phase: 02-homepage*
*Completed: 2026-03-20*
