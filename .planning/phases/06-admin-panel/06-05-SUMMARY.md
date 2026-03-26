---
phase: 06-admin-panel
plan: "05"
subsystem: ui, storage
tags: [dnd-kit, supabase-storage, image-upload, drag-drop, admin, products]

# Dependency graph
requires:
  - phase: 06-04
    provides: ProductForm component with save payload wired to API routes
provides:
  - ImageUploader component — drag-drop zone + dnd-kit sortable thumbnails, direct browser upload to product-images bucket
  - ProductForm extended with imageUrls state and image/images fields in PUT/POST payload
  - product-images Supabase Storage bucket integration via createBrowserClient
affects: [storefront catalog, product detail gallery, 06-04]

# Tech tracking
tech-stack:
  added:
    - "@dnd-kit/core@^6"
    - "@dnd-kit/sortable@^7"
    - "@dnd-kit/utilities@^3"
  patterns:
    - Direct browser-to-Supabase Storage upload bypasses Next.js body size limits
    - SortableThumb: useSortable + CSS.Transform.toString + e.stopPropagation on remove button
    - onImagesChange callback: useEffect([images]) notifies parent on every state mutation
    - imageUrls state in ProductForm: first URL = products.image (thumbnail), all = products.images[]

key-files:
  created:
    - src/app/(admin)/_components/ImageUploader.tsx
  modified:
    - src/app/(admin)/_components/ProductForm.tsx

key-decisions:
  - "PointerSensor only for dnd-kit — handles both mouse and touch via pointer events; no need for TouchSensor"
  - "e.stopPropagation on remove button's onPointerDown prevents dnd-kit drag intercepting the click"
  - "tempId via useState(() => crypto.randomUUID()) — stable across re-renders, used as upload path prefix for new products"
  - "unoptimized on Image component for Supabase CDN thumbnails — avoids next/image domain config requirement"
  - "uploadFile loops sequentially per file — avoids race on images.length >= 5 guard"

patterns-established:
  - "Browser upload pattern: createBrowserClient() + storage.from().upload() + getPublicUrl() — no server round-trip"
  - "Remove button stops propagation: onPointerDown stops event before dnd-kit sees it; onClick fires normally"

# Metrics
duration: 4min
completed: 2026-03-26
---

# Phase 6 Plan 05: Product Image Upload Summary

**dnd-kit sortable image uploader with direct browser-to-Supabase Storage upload, drag-to-reorder thumbnails, and ProductForm wired to persist image/images fields**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-26T07:34:48Z
- **Completed:** 2026-03-26T07:38:27Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- Admin can drag files or click to select up to 5 product images; uploads go directly browser → Supabase Storage, bypassing Next.js body limits
- Uploaded images appear as draggable thumbnails with a "Primary" badge on the first item; order determines products.image (card thumbnail)
- ProductForm save payload now includes `image` (first URL or SVG placeholder) and `images` (ordered URL array)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dnd-kit + create ImageUploader component** - `f2fc137` (feat)
2. **Task 2: Integrate ImageUploader into ProductForm** - `1148686` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `src/app/(admin)/_components/ImageUploader.tsx` — drop zone + dnd-kit DndContext/SortableContext/SortableThumb, direct Supabase Storage upload, max 5 images, onImagesChange callback
- `src/app/(admin)/_components/ProductForm.tsx` — imageUrls state, ImageUploader rendered below Variants section, image/images in save payload, removed unused useEffect import

## Decisions Made

- **PointerSensor only** — handles both mouse and touch via pointer events API; no separate TouchSensor needed
- **e.stopPropagation on onPointerDown** — prevents dnd-kit from swallowing the remove button click; onClick still fires normally after propagation stops
- **tempId for new products** — `useState(() => crypto.randomUUID())` gives a stable path prefix for uploads before a product ID exists; path updated to real ID on next edit
- **unoptimized on next/image** — Supabase CDN URLs are external; avoids needing to add domain to next.config.ts for 80x80 thumbnails
- **Sequential upload loop** — iterating with `await uploadFile(file)` inside for-of ensures the images.length guard is evaluated after each upload

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

The `product-images` Supabase Storage bucket must exist and be set to public. If not already created:

1. Supabase dashboard → Storage → New bucket
2. Name: `product-images`, toggle Public on
3. No RLS policy needed for public read; upload uses the anon key (browser client)

## Next Phase Readiness

- Image upload and reorder is fully wired; admin can upload real product photos without developer involvement
- Storefront /catalog and /catalog/[slug] pages will display uploaded images once products are saved with them
- Phase 6 admin panel is now feature-complete: dashboard, orders, products (CRUD + images), reviews, settings

---
*Phase: 06-admin-panel*
*Completed: 2026-03-26*
