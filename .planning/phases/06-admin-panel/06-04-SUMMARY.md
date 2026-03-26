---
phase: 06-admin-panel
plan: "04"
subsystem: ui, api
tags: [tiptap, rich-text, supabase, admin, products, forms, variants, price-tiers]

# Dependency graph
requires:
  - phase: 06-03
    provides: admin product list page + ProductListTable component
provides:
  - POST /api/admin/products — create product with price_tiers enforcement
  - PUT /api/admin/products/[id] — update product with price_tiers enforcement
  - DELETE /api/admin/products/[id] — remove product
  - RichTextEditor component (Tiptap, Bold/Italic/BulletList, immediatelyRender: false)
  - VariantTable component (inline editable rows with price_tiers editor)
  - ProductForm component (create/edit, slug auto-gen, toast, delete confirm)
  - /admin/products/new page (create mode)
  - /admin/products/[id] page (edit mode, notFound on missing)
affects: [06-05, storefront catalog]

# Tech tracking
tech-stack:
  added:
    - "@tiptap/react@^2"
    - "@tiptap/pm@^2"
    - "@tiptap/starter-kit@^2"
  patterns:
    - Admin form pattern: Server Component page fetches + passes to 'use client' form
    - API routes enforce price_tiers shape (fallback to [{qty:1, price}] when absent)
    - Toast pattern: useState<{type,message}|null> + setTimeout(3000)
    - notFound() on missing product in [id] page
    - Next.js 15 async params: await params in Server Component

key-files:
  created:
    - src/app/(admin)/_components/RichTextEditor.tsx
    - src/app/(admin)/_components/VariantTable.tsx
    - src/app/(admin)/_components/ProductForm.tsx
    - src/app/(admin)/admin/products/new/page.tsx
    - src/app/(admin)/admin/products/[id]/page.tsx
    - src/app/api/admin/products/route.ts
    - src/app/api/admin/products/[id]/route.ts
  modified: []

key-decisions:
  - "Tiptap immediatelyRender: false prevents SSR hydration mismatch on description editor"
  - "price_tiers enforcement in API: missing tiers default to [{qty:1,price:variant.price}] — storefront pack-size picker never crashes"
  - "price_min/price_max computed server-side from all tier prices across all variants"
  - "Delete pattern: confirm dialog in form (no modal library), then DELETE /api/admin/products/[id]"
  - "Slug auto-generated from name on blur only if slug field is empty and not in edit mode"

patterns-established:
  - "ProductForm admin pattern: product prop undefined = create, defined = edit; all API differences handled internally"
  - "Admin Server Component pages: createClient + getUser + redirect + createAdminClient data fetch + pass as props"

# Metrics
duration: 20min
completed: 2026-03-26
---

# Phase 6 Plan 04: Product Create/Edit Form Summary

**Tiptap rich-text editor, inline variant/price-tiers table, and full CRUD API routes for admin product management via /admin/products/new and /admin/products/[id]**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-26T00:00:00Z
- **Completed:** 2026-03-26T00:20:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Admin can create new products at /admin/products/new with all fields including rich text description and inline variant editing
- Admin can edit existing products at /admin/products/[id] with form pre-filled from Supabase data
- All API routes enforce price_tiers shape — prevents storefront pack-size picker from crashing on variants created via admin
- Delete flow with confirm dialog removes product from Supabase and redirects to product list

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Tiptap + product API routes** - `fca8fc1` (feat) — API routes only (prior session)
2. **Task 1 components: ProductForm + RichTextEditor + VariantTable** - `e6730bf` (feat)
3. **Task 2: /admin/products/new and /admin/products/[id] pages** - `075f3b8` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `src/app/api/admin/products/route.ts` — POST handler: auth check, validate, enforce price_tiers, compute price_min/max, insert
- `src/app/api/admin/products/[id]/route.ts` — PUT + DELETE handlers with same auth + price_tiers enforcement
- `src/app/(admin)/_components/RichTextEditor.tsx` — Tiptap editor with Bold/Italic/BulletList toolbar, immediatelyRender: false
- `src/app/(admin)/_components/VariantTable.tsx` — inline editable rows, expandable tier editor, add/remove variants and tiers
- `src/app/(admin)/_components/ProductForm.tsx` — full create/edit form, slug auto-gen on name blur, toast, useTransition, delete confirm
- `src/app/(admin)/admin/products/new/page.tsx` — auth-guarded Server Component, renders ProductForm without product prop
- `src/app/(admin)/admin/products/[id]/page.tsx` — auth-guarded Server Component, fetches product by ID, passes to ProductForm, notFound() on missing

## Decisions Made

- **Tiptap immediatelyRender: false** — prevents SSR/hydration mismatch, required for App Router Server Components
- **price_tiers fallback in API** — if variant arrives without price_tiers, server sets `[{qty:1, price:variant.price}]`; ensures storefront never crashes
- **price_min/price_max computed from tier prices** — Math.min/max over all tier prices across all variants; consistent with how storefront sorts
- **Slug auto-generate on name blur** — only when slug field is empty AND not in edit mode; avoids overwriting existing slugs
- **Delete confirm inline** — uses local showDeleteConfirm state, no modal library dependency

## Deviations from Plan

None — plan executed exactly as written. All files existed partially from a prior session; page wrappers were the missing artifacts, created as specified.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Product CRUD is complete; admin can create/edit/delete products
- /admin/products/[id] edit page is live — Plan 06-05 (product image upload) can add image field to ProductForm and PUT payload
- All storefront price_tiers handling is safe — new products created via admin will have correct shape
- Storefront /catalog and /catalog/[slug] pages unaffected — no regressions

---
*Phase: 06-admin-panel*
*Completed: 2026-03-26*
