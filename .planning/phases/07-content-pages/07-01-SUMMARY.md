---
phase: 07-content-pages
plan: "01"
subsystem: database
tags: [typescript, supabase, admin, navigation]

# Dependency graph
requires:
  - phase: 06-admin-panel
    provides: AdminSidebar component and admin shell layout
provides:
  - Supabase Database type extended with about_sections, faqs, blog_posts tables
  - Convenience type aliases: AboutSection, Faq, FaqInsert, BlogPost, BlogPostInsert
  - AdminSidebar Content section with four nav links (About Page, FAQs, Blog, Shipping Info)
affects:
  - 07-02-about-page
  - 07-03-faqs
  - 07-04-blog
  - 07-05-shipping

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Content table DDL comments in supabase.ts — SQL migration notes co-located with type definitions"
    - "Grouped nav section pattern — CONTENT_LINKS array + uppercase separator label in SidebarContent"

key-files:
  created: []
  modified:
    - src/types/supabase.ts
    - src/app/(admin)/_components/AdminSidebar.tsx

key-decisions:
  - "about_sections uses text PK ('founder-story' | 'brand-mission' etc.) not uuid — fixed set of sections"
  - "blog_posts tag is freeform string, no separate categories table — simpler for v1"
  - "blog_posts RLS: public SELECT WHERE published = true only — drafts not exposed without service role"
  - "faqs answer is plain text (not Tiptap HTML) — no rich formatting needed for FAQ answers"

patterns-established:
  - "Content nav group: CONTENT_LINKS separate array + 'CONTENT' uppercase label separator, same NavLink component reused"
  - "DDL comments in supabase.ts: each new table gets SQL CREATE TABLE + RLS policy note as code comment"

# Metrics
duration: 4min
completed: 2026-03-26
---

# Phase 7 Plan 01: Content Page Types and Admin Nav Summary

**Supabase TypeScript types for about_sections, faqs, and blog_posts tables with convenience aliases; AdminSidebar extended with grouped Content nav section**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-26T12:13:58Z
- **Completed:** 2026-03-26T12:17:43Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Three new Supabase table types (about_sections, faqs, blog_posts) added to Database interface with correct Row/Insert/Update/Relationships shape
- Five convenience type aliases exported (AboutSection, Faq, FaqInsert, BlogPost, BlogPostInsert) following existing Order/OrderItem pattern
- AdminSidebar now shows a "CONTENT" group below existing links with four entries: About Page, FAQs, Blog, Shipping Info
- Build and tsc --noEmit both pass cleanly with no errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend supabase.ts with content page table types** - `d1d3824` (feat)
2. **Task 2: Add content management links to AdminSidebar** - `8a23c03` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified
- `src/types/supabase.ts` - Added about_sections, faqs, blog_posts table types + 5 convenience aliases
- `src/app/(admin)/_components/AdminSidebar.tsx` - Added CONTENT_LINKS array and Content section separator

## Decisions Made
- about_sections uses a text primary key (e.g. 'founder-story', 'brand-mission') rather than a uuid — there is a fixed known set of sections, text PK allows upsert by meaningful ID without needing to track uuids.
- blog_posts `tag` field is a freeform string; no separate tags/categories table in v1 — avoids unnecessary join complexity for a simple blog.
- blog_posts RLS note: public SELECT filters to published=true; drafts only readable via service-role client in admin.
- faqs `answer` is plain text (not Tiptap HTML) — FAQ answers don't need rich formatting; plain text is simpler to render and search.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Database tables must be created in Supabase before the admin forms in Wave 2 plans can read/write. SQL DDL comments in supabase.ts provide the migration statements.

## Next Phase Readiness
- Wave 2 plans (07-02 through 07-05) can now import AboutSection, Faq, FaqInsert, BlogPost, BlogPostInsert from src/types/supabase.ts
- Admin nav links to /admin/pages, /admin/faqs, /admin/blog, /admin/shipping are live (will 404 until those route handlers are built in Wave 2)
- No blockers for parallel Wave 2 execution

---
*Phase: 07-content-pages*
*Completed: 2026-03-26*
