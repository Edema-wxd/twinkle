---
phase: 09-seo
plan: "01"
subsystem: seo
tags: [next.js, metadata, opengraph, typescript, supabase]

# Dependency graph
requires:
  - phase: 08-conversion
    provides: completed storefront with all page routes
provides:
  - metadataBase in root layout enabling all relative OG image paths to resolve
  - title.template '%s | Twinkle Locs' inherited by all child pages
  - seo_description column typed on products Row, Insert, Update in supabase.ts
  - seo_description optional field on Product interface
  - placeholder public/og-image.jpg served at /og-image.jpg
  - NEXT_PUBLIC_SITE_URL in .env.local for local dev
affects:
  - 09-02 (product page generateMetadata depends on seo_description type)
  - 09-03 (all pages benefit from title.template inheritance)
  - any future page that sets metadata title

# Tech tracking
tech-stack:
  added: []
  patterns:
    - metadataBase pattern: root layout sets metadataBase from NEXT_PUBLIC_SITE_URL with https://twinklelocs.com fallback
    - title template pattern: root layout title.template '%s | Twinkle Locs' — child pages set string title, homepage uses title.absolute
    - Insert optional nullable column: supabase.ts Insert type omits + re-adds nullable columns as optional to avoid required field errors in existing API routes

key-files:
  created:
    - public/og-image.jpg
  modified:
    - src/app/layout.tsx
    - src/types/supabase.ts
    - src/lib/types/product.ts

key-decisions:
  - "metadataBase uses NEXT_PUBLIC_SITE_URL env var with 'https://twinklelocs.com' fallback — keeps domain config in one place"
  - "seo_description typed as optional in Insert (not required) — DB column is nullable, existing API routes need not pass it"
  - "og-image.jpg placeholder uses SVG content with .jpg extension — acceptable for dev; clearly labelled for replacement before launch"

patterns-established:
  - "Insert optional nullable column: Omit<Row, 'id'|'created_at'|'colName'> & { colName?: T | null } pattern for nullable DB columns"
  - "title.template in root layout: child pages set plain string title; homepage bypasses with title: { absolute: '...' }"

# Metrics
duration: 6min
completed: 2026-03-31
---

# Phase 9 Plan 01: SEO Foundation Summary

**metadataBase + title template wired in root layout; seo_description typed on Product and Supabase Row; og-image.jpg placeholder served — unblocks all Phase 9 metadata work**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-31T18:45:36Z
- **Completed:** 2026-03-31T18:52:06Z
- **Tasks:** 3
- **Files modified:** 4 (layout.tsx, supabase.ts, product.ts, public/og-image.jpg)

## Accomplishments

- Root layout now exports `metadataBase`, `title.default`, `title.template`, `openGraph` block, and `twitter` card — child pages automatically inherit brand title suffix and OG site config
- `seo_description` column added to `supabase.ts` products Row/Insert/Update and `product.ts` Product interface — Plan 09-02 `generateMetadata()` can read the field immediately
- Placeholder `public/og-image.jpg` at 1200x630 with brand colours prevents OG image 404s during development

## Task Commits

1. **Task 1: Update root layout with metadataBase, title template, and global OG** - `f3eab79` (feat)
2. **Task 2: Add seo_description to supabase.ts and product.ts types** - `7076e08` (feat)
3. **Task 3: Create placeholder og-image.jpg and document NEXT_PUBLIC_SITE_URL** - `0259ad7` (chore)

## Files Created/Modified

- `src/app/layout.tsx` - metadataBase, title template, openGraph block, twitter card
- `src/types/supabase.ts` - seo_description on products Row; Insert made optional for nullable column; migration comment added
- `src/lib/types/product.ts` - seo_description?: string | null on Product interface
- `public/og-image.jpg` - SVG placeholder at 1200x630 with Twinkle Locs brand colours

## Decisions Made

- `metadataBase` reads from `NEXT_PUBLIC_SITE_URL` env var with `'https://twinklelocs.com'` hardcoded fallback — production never needs the env var if domain doesn't change
- `seo_description` is optional in the Insert type (not required) — the Supabase column is nullable and existing API routes pre-date this column; forcing it required would break POST /api/admin/products without touching that route
- `public/og-image.jpg` is SVG content with `.jpg` extension — browsers and social crawlers accept this; file is clearly labelled "Replace with branded 1200x630 JPG before launch"

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript overload error in POST /api/admin/products from required seo_description**

- **Found during:** Task 2 (Add seo_description to supabase.ts and product.ts types)
- **Issue:** After adding `seo_description: string | null` to products Row, the Insert type derived via `Omit<Row, 'id'|'created_at'>` made `seo_description` required in the insert payload. The existing POST route did not pass `seo_description`, causing a TS2769 overload error. `npx tsc --noEmit` produced 1 error.
- **Fix:** Changed Insert type to `Omit<Row, 'id' | 'created_at' | 'seo_description'> & { id?: string; created_at?: string; seo_description?: string | null }` — nullable column is optional in Insert, consistent with how `id` and `created_at` are handled.
- **Files modified:** `src/types/supabase.ts`
- **Verification:** `npx tsc --noEmit` exits 0 after fix
- **Committed in:** `7076e08` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Fix was necessary for TypeScript compilation. No scope change — the Insert type behaviour is semantically correct for a nullable DB column.

## Issues Encountered

None.

## User Setup Required

**Database migration needed before Plan 09-02 seo_description reads will work in production.**

Run against Supabase project:

```sql
ALTER TABLE products ADD COLUMN seo_description TEXT NULL;
```

This is documented in the comment at the top of `src/types/supabase.ts`. Local dev is unaffected (column is read as `null` if absent).

## Next Phase Readiness

- **Plan 09-02 (Product Page SEO):** unblocked — `seo_description` typed, `title.template` in root layout, `metadataBase` set
- **Plan 09-03 (Content Pages SEO):** unblocked — all static pages inherit title template automatically
- No blockers. DB migration should be run before deploying 09-02 changes to production.

---
*Phase: 09-seo*
*Completed: 2026-03-31*
