---
phase: 11-migrate-from-supabase-to-neon-uploadthing
verified: "2026-04-28"
status: passed
---

## Goal

Migrate Twinkle Locs off Supabase (DB + auth + storage) onto **Neon + Drizzle**, **better-auth**, and **UploadThing**, while keeping the app building cleanly.

## Evidence (must-haves)

- **DB migration present** (Neon/Drizzle)
  - `src/db/schema.ts`, `src/db/index.ts`, `src/db/columns.ts` exist (see Phase 11-01 summary).
- **Auth migration present** (better-auth)
  - Admin flows use `requireAdminSession()` / `getAdminSession()` (see Phase 11-02 summary).
- **Storage migration present** (UploadThing)
  - UploadThing route exists at `src/app/api/uploadthing/*` and admin upload components use it (see Phase 11-03 summary).
- **No Supabase references remain in src/**
  - Verified via repo search: `supabase` has **0 matches** under `src/`.
- **Build and types are clean**
  - `npx tsc --noEmit` ✅
  - `npm run build` ✅ (Next.js 15 build succeeded locally)

## Fixes applied during verification

- **Paystack webhook retry correctness**
  - `src/app/api/webhooks/paystack/route.ts`: if `handleChargeSuccess()` throws after signature verification, the handler now returns **HTTP 500** (non-2xx) so Paystack can retry; also normalizes `customerEmail` to lowercase on insert.

## Gates

- **Schema drift**: `verify schema-drift 11` → `drift_detected: false`

## Result

**passed** — Phase 11 migration is present and the project builds cleanly.

