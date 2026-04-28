---
phase: 11
plan: 03
status: completed
completed_at: "2026-04-28"
---

## One-liner

Migrated all admin image uploads from Supabase Storage to UploadThing, removed all Supabase packages + local helpers, scrubbed Supabase env vars, and verified `next build` succeeds.

## What changed

### UploadThing wiring (already present, validated)
- `src/app/api/uploadthing/core.ts`: `productImages` + `contentImages` endpoints, auth-gated via `getAdminSession()`
- `src/app/api/uploadthing/route.ts`: route handler
- `src/lib/uploadthing/index.ts`: typed `useUploadThing`, `UploadButton`, `UploadDropzone`
- `next.config.ts`: remotePatterns includes both legacy `*.supabase.co` and new `*.ufs.sh`
- `middleware.ts`: matcher excludes `api/uploadthing`

### Storage swaps (Supabase Storage → UploadThing)
- `src/app/(admin)/_components/ImageUploader.tsx`:
  - uses `useUploadThing('productImages')`
  - preserves drag/drop, reorder, max-5, primary badge, and parent `onImagesChange` callback
  - stores returned `ufsUrl` values as the persisted image URLs
- `src/app/(admin)/_components/BlogPostForm.tsx`:
  - uses `useUploadThing('contentImages')` to set `featured_image` to `ufsUrl`
- `src/app/(admin)/_components/AboutPagesForm.tsx`:
  - uses `useUploadThing('contentImages')`, tracks active section upload, and writes `image_url` to `ufsUrl`

### Type cleanup (delete `src/types/supabase.ts` safely)
- Added `src/types/db.ts` to preserve the existing snake_case DTO types used by UI components/pages (no Supabase dependency).
- Updated all `@/types/supabase` imports in `src/` to `@/types/db`.

### Supabase removal
- Deleted:
  - `src/lib/supabase/server.ts`
  - `src/lib/supabase/client.ts`
  - `src/lib/supabase/admin.ts`
  - `src/lib/supabase/schema.sql`
  - `src/types/supabase.ts`
- Uninstalled npm packages:
  - `@supabase/ssr`
  - `@supabase/supabase-js`
  - `supabase` (devDependency)
- Scrubbed env vars from `.env.local` and `.env.local.example`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

## Verification

- `npx tsc --noEmit` passes.
- `npm run build` passes.
- `rg "supabase\\.storage|@/lib/supabase/" src/` returns no matches.

## Notes

- Legacy image URLs already stored in the database may still be `*.supabase.co`. We intentionally keep `*.supabase.co` in `next.config.ts` `images.remotePatterns` so those existing images continue rendering until they are re-uploaded through the admin UI.

