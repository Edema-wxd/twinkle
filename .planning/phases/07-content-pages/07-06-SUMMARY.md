---
phase: 07-content-pages
plan: "06"
subsystem: ui
tags: [nextjs, supabase, blog, rsc, server-components, tailwind]

# Dependency graph
requires:
  - phase: 07-05
    provides: blog_posts Supabase table and admin CRUD — public pages read from this data layer
provides:
  - /blog listing page with published posts and tag category filter (URL search params, router.push)
  - /blog/[slug] individual post page with full Tiptap HTML body, share buttons, related posts
  - BlogPostCard: Server Component card with image, title, excerpt, tag pill, date
  - BlogCategoryFilter: use client filter tabs using router.push — no full-page reload
  - BlogShareButtons: use client WhatsApp + Twitter/X share links (URL passed as prop from server)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Client island in Server Component page: BlogCategoryFilter wrapped in Suspense; page.tsx stays Server Component
    - Canonical URL server-side construction: built from NEXT_PUBLIC_SITE_URL env in Server Component, passed as prop to client — avoids window.location.href SSR crash
    - Tiptap HTML rendering without prose: [&_tag]: Tailwind selectors for headings/paragraphs/lists/links — @tailwindcss/typography not installed
    - Draft-as-404 pattern: .eq('published', true) in slug query; notFound() on error or null — drafts are 404 on public pages

key-files:
  created:
    - src/app/blog/page.tsx
    - src/app/blog/[slug]/page.tsx
    - src/components/blog/BlogPostCard.tsx
    - src/components/blog/BlogCategoryFilter.tsx
    - src/components/blog/BlogShareButtons.tsx
  modified: []

key-decisions:
  - "BlogCategoryFilter wrapped in Suspense: useSearchParams() inside BlogCategoryFilter requires Suspense boundary per Next.js 15 client component rules"
  - "Conditional related posts query: skips Supabase call entirely when post.tag is null — no unnecessary DB round-trip"
  - "WhatsApp wa.me/?text= (no phone): opens contact picker, distinct from checkout WhatsApp CTA which dials business number"

patterns-established:
  - "Suspense wrapper for client island with useSearchParams: required in Next.js 15 App Router when parent is a Server Component"
  - "Server-constructed canonical URL prop: pass URL string as prop to BlogShareButtons — never derive from window.location in client component render"

# Metrics
duration: 3min
completed: 2026-03-26
---

# Phase 7 Plan 06: Blog Public Pages Summary

**Public /blog listing with tag category filter and /blog/[slug] post page with Tiptap HTML rendering, WhatsApp + Twitter share buttons, and up-to-3 related posts from same tag**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-26T12:44:58Z
- **Completed:** 2026-03-26T12:47:44Z
- **Tasks:** 2
- **Files modified:** 5 created

## Accomplishments

- Built /blog listing page as Server Component — fetches published posts with optional tag filter, derives distinct tags list for filter tabs; drafts never shown
- Built /blog/[slug] post page — fetches by slug with published=true guard (drafts 404), renders Tiptap HTML body with [&_tag]: Tailwind selectors, related posts from same tag, share buttons
- Built BlogShareButtons (client island) with WhatsApp wa.me/?text= and Twitter intent URLs constructed server-side and passed as prop — no SSR window access
- Build passes zero errors; /blog and /blog/[slug] both appear in Next.js route table as dynamic server-rendered routes

## Task Commits

Each task was committed atomically:

1. **Task 1: Blog listing page with category filter** - `db85d6c` (feat)
2. **Task 2: Individual blog post page with share buttons and related posts** - `00492d6` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `src/app/blog/page.tsx` - Server Component: fetches published posts + distinct tags, applies category searchParam filter, renders BlogPostCard grid
- `src/app/blog/[slug]/page.tsx` - Server Component: fetches post by slug + published=true, notFound() on miss/draft, related posts query, share buttons
- `src/components/blog/BlogPostCard.tsx` - Server Component card: featured image (with bg-stone-100 fallback), title with hover underline, excerpt (line-clamp-3), tag pill, formatted date
- `src/components/blog/BlogCategoryFilter.tsx` - use client: tag filter tabs using useRouter + useSearchParams; router.push() — no full-page reload
- `src/components/blog/BlogShareButtons.tsx` - use client: WhatsApp wa.me/?text= + Twitter intent links; URL + title passed as props from Server Component parent

## Decisions Made

- **BlogCategoryFilter inside Suspense**: useSearchParams() requires a Suspense boundary when the parent page is a Server Component in Next.js 15 App Router — wrapped at the page level
- **Conditional related posts query**: related posts Supabase call is skipped entirely when `post.tag` is null — saves a DB round-trip for untagged posts
- **WhatsApp wa.me/?text= (no phone number)**: opens contact picker, not the Unoma business number — share intent is different from the checkout WhatsApp CTA

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. The blog_posts Supabase table was created in Phase 07-05.

## Next Phase Readiness

- Phase 7 (Content Pages) is now fully complete: about, contact, shipping, FAQ, blog admin, and public blog all built
- No blockers for next phase
- All content accessible at /about, /contact, /shipping, /faq, /blog, /blog/[slug]

---
*Phase: 07-content-pages*
*Completed: 2026-03-26*
