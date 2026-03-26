---
phase: 07-content-pages
plan: "05"
subsystem: ui, api
tags: [nextjs, supabase, tiptap, blog, admin, crud]

# Dependency graph
requires:
  - phase: 07-01
    provides: about_sections admin pattern (Server Component page + use client form + API route)
  - phase: 07-03
    provides: FaqForm pattern (dual-mode create/edit, toast, delete confirm) for BlogPostForm
  - phase: 06-05
    provides: content-images Supabase Storage bucket and ImageUploader browser upload pattern
provides:
  - /admin/blog post list with Published/Draft status badges
  - /admin/blog/new create form with Tiptap editor and image upload
  - /admin/blog/[id] edit form pre-filled from Supabase; delete with inline confirm
  - POST /api/admin/blog — create blog_posts row with slug conflict 409 and published_at auto-set
  - PUT /api/admin/blog/[id] — partial update, published_at set on first publish transition
  - DELETE /api/admin/blog/[id] — hard delete by ID
affects:
  - 07-06 (public /blog and /blog/[slug] pages read from blog_posts data layer)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Blog admin CRUD: Server Component page -> use client BlogPostForm -> fetch to /api/admin/blog
    - published_at auto-set: API sets now() when published transitions false->true and no explicit timestamp provided
    - Content image upload: createBrowserClient() + storage.from('content-images') + path blog/${Date.now()}-${filename}
    - Slug conflict: Postgres unique constraint code 23505 mapped to HTTP 409

key-files:
  created:
    - src/app/api/admin/blog/route.ts
    - src/app/api/admin/blog/[id]/route.ts
    - src/app/(admin)/_components/BlogPostForm.tsx
    - src/app/(admin)/admin/blog/page.tsx
    - src/app/(admin)/admin/blog/new/page.tsx
    - src/app/(admin)/admin/blog/[id]/page.tsx
  modified: []

key-decisions:
  - "BlogPostForm single-file upload pattern: click-to-upload only (no drag-drop) for featured image — simpler than ImageUploader since only one image needed"
  - "published_at transition guard in PUT route: only auto-sets published_at when currentPost.published is false and incoming published is true — no overwrite on repeat saves"
  - "Slug conflict returns 409: Postgres code 23505 (unique_violation) mapped to HTTP 409 Conflict for clean client-side error message"

patterns-established:
  - "Blog admin CRUD mirrors products admin pattern: Server Component page + use client form + API routes"
  - "Featured image for single-image upload: simpler inline upload handler vs ImageUploader (which handles multi-image DnD)"

# Metrics
duration: 12min
completed: 2026-03-26
---

# Phase 7 Plan 05: Blog Admin CRUD Summary

**Full admin CRUD for blog posts — /admin/blog list, /admin/blog/new, /admin/blog/[id] edit with Tiptap editor, featured image upload to content-images bucket, slug auto-generation, and published toggle**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-26T09:38:42Z
- **Completed:** 2026-03-26T09:50:00Z
- **Tasks:** 2
- **Files modified:** 6 created

## Accomplishments

- Built POST + PUT + DELETE API routes for blog_posts with auth guard, slug conflict detection (409), and published_at auto-set on first publish
- Built BlogPostForm ('use client') with Tiptap body, single-image upload to content-images bucket, slug auto-generation on title blur (create mode only), published checkbox, and delete-with-confirm
- Built admin pages: list (/admin/blog), create (/admin/blog/new), edit (/admin/blog/[id]) — all Server Components with belt-and-braces auth

## Task Commits

Each task was committed atomically:

1. **Task 1: Blog API routes (POST + PUT/DELETE)** - `c44b18f` (feat)
2. **Task 2: Blog admin pages and BlogPostForm component** - `d10e373` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `src/app/api/admin/blog/route.ts` - POST handler: create blog_posts with auth guard, slug generation, 409 on conflict
- `src/app/api/admin/blog/[id]/route.ts` - PUT/DELETE handlers: partial update with published_at transition guard, hard delete
- `src/app/(admin)/_components/BlogPostForm.tsx` - use client form: title/slug/excerpt/tag/body/image/published fields, create+edit modes, toast, delete confirm
- `src/app/(admin)/admin/blog/page.tsx` - Server Component list: post table with Published/Draft badges and edit links
- `src/app/(admin)/admin/blog/new/page.tsx` - Server Component: mounts BlogPostForm in create mode
- `src/app/(admin)/admin/blog/[id]/page.tsx` - Server Component: fetches post, mounts BlogPostForm in edit mode

## Decisions Made

- **BlogPostForm single-file upload**: uses inline click-to-upload handler (not the multi-image ImageUploader component) since a blog featured image is always one image; avoids DnD complexity
- **published_at transition guard in PUT**: API fetches current post first, only auto-sets published_at when transitioning from unpublished to published — prevents overwriting the original publish date on subsequent saves
- **Slug conflict as 409**: Postgres unique constraint violation code 23505 mapped to HTTP 409 Conflict — distinct from 400 validation errors; client can display "slug already exists" message

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. The content-images Supabase Storage bucket was created in Phase 06-05.

## Next Phase Readiness

- blog_posts data layer fully established — Plan 06 (public /blog and /blog/[slug] pages) can now read published posts from Supabase
- Admin can create and publish posts before the public pages are built
- No blockers

---
*Phase: 07-content-pages*
*Completed: 2026-03-26*
