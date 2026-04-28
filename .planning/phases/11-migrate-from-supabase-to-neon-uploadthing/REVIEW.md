---
phase: 11-migrate-from-supabase-to-neon-uploadthing
reviewed: 2026-04-28T21:58:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - src/db/schema.ts
  - src/db/index.ts
  - src/db/columns.ts
  - drizzle.config.ts
  - src/lib/auth/index.ts
  - src/lib/auth/server.ts
  - src/lib/auth/client.ts
  - middleware.ts
  - src/app/api/uploadthing/core.ts
  - src/app/api/uploadthing/route.ts
  - src/lib/uploadthing/index.ts
  - src/lib/uploadthing/server.ts
  - src/app/api/webhooks/paystack/route.ts
  - src/app/api/newsletter/subscribe/route.ts
  - src/app/api/orders/[reference]/route.ts
  - src/app/orders/[reference]/page.tsx
  - src/app/api/admin/orders/[id]/route.ts
  - src/app/api/admin/products/[id]/route.ts
findings:
  critical: 1
  warning: 4
  info: 2
  total: 7
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-04-28T21:58:00Z  
**Depth:** standard  
**Files Reviewed:** 18  
**Status:** issues_found

## Summary

The Supabase → Neon/Drizzle + better-auth + Uploadthing migration is largely consistent and cohesive:
- Drizzle schema appears to preserve the important column-type quirks (kobo integers on `orders.*`, NUMERIC(10,2) on `abandoned_orders.*`, JSONB fields, text PK on `about_sections.id`).
- Auth is correctly split into a fast middleware cookie-presence check and authoritative session validation in server components / API routes.
- Uploadthing is auth-gated via `getAdminSession()` and `next.config.ts` allows both legacy `*.supabase.co` and new `*.ufs.sh` images.

However, there is **one critical correctness issue** in the Paystack webhook handler: it returns HTTP 200 on processing errors after signature verification, which can leave the database in a partially-written state and prevents Paystack retries. There are also a few migration-hardening warnings around env-var guards and time zone consistency.

## Critical Issues

### CR-01: Paystack webhook returns 200 on processing failure (prevents retries; can drop `order_items`)

**File:** `src/app/api/webhooks/paystack/route.ts:79-89, 154-157`  
**Issue:** `handleChargeSuccess()` can throw (e.g., `db.insert(orderItems)`), but `POST()` catches that error and still returns HTTP 200:
- The code comment says “Throw on failure so the outer try/catch returns non-200 — Paystack will retry”, but the outer `catch` returns 200 with a warning.
- Result: an order header may be inserted, but `order_items` may not, and Paystack will not retry.

**Fix:**
- After signature verification and successful JSON parsing, return **non-2xx** on processing errors so Paystack retries.
- Optionally make the order + items insert atomic. With `drizzle-orm` you can use a transaction when supported by the driver; if the Neon HTTP driver limits transactions, at least ensure failures produce non-2xx and consider compensating deletes.

Concrete minimal change (preserve 200 only for malformed payloads):

```ts
// src/app/api/webhooks/paystack/route.ts
try {
  if (event.event === 'charge.success') {
    await handleChargeSuccess(event.data)
  }
} catch (err) {
  console.error('[webhook] Unhandled error in handleChargeSuccess:', err)
  return NextResponse.json({ error: 'processing_error' }, { status: 500 })
}
```

If you want to avoid infinite retries for a specific class of “bad payload” errors, explicitly detect that case (e.g., missing metadata) and return 200 only then.

## Warnings

### WR-01: Missing env-var guards can crash requests with unclear errors

**Files:**
- `src/db/index.ts:5-6` (`process.env.DATABASE_URL!`)
- `drizzle.config.ts:8` (`process.env.DATABASE_URL!` fallback)
- `src/lib/auth/index.ts:15-16` (`BETTER_AUTH_SECRET!`, `BETTER_AUTH_URL!`)
- `src/app/api/webhooks/paystack/route.ts:61-64` (`PAYSTACK_SECRET_KEY!`)

**Issue:** Non-null assertions on required env vars can cause runtime crashes (500s) that are hard to diagnose, especially in serverless environments where the stack trace may be truncated.

**Fix:** Validate required env vars at module init and throw a clear error (or in handlers, return a 500 with a safe message). Example pattern:

```ts
function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var: ${name}`)
  return v
}
```

Then replace `process.env.DATABASE_URL!` with `requireEnv('DATABASE_URL')`, etc.

### WR-02: better-auth tables use `timestamp()` without `{ withTimezone: true }` while app tables use `timestamptz`

**File:** `src/db/schema.ts:17-65`  
**Issue:** App tables consistently use `timestamp(..., { withTimezone: true })`, but better-auth tables use `timestamp('...')` without timezone options. This can introduce mixed time semantics and subtle bugs in expiry comparisons depending on your DB defaults.

**Fix:** Align on timestamptz for auth tables if better-auth supports it in your schema definition (or ensure DB columns are created as timestamptz via migrations). At minimum, confirm Neon column types for `session.expires_at`, `created_at`, `updated_at` match expectations.

### WR-03: Uploadthing deletion helper doesn’t validate delete results (silent partial failures)

**File:** `src/lib/uploadthing/server.ts:21-35`  
**Issue:** `utapi.deleteFiles(keys)` is awaited, but its return value isn’t checked/logged. If Uploadthing rejects some keys, cleanup may silently fail and leave orphaned files.

**Fix:** Capture and log the response, and consider returning `{ deleted, attempted, failedKeys }` so callers can decide whether to surface a warning in the admin UI.

### WR-04: Paystack webhook data normalization not applied consistently

**File:** `src/app/api/webhooks/paystack/route.ts:121-129, 166-168`  
**Issue:** Abandoned-order recovery matches on `customer_email` lowercased, but the inserted order stores `customerEmail: data.customer.email` without `.toLowerCase()`. If other parts of the system assume normalized lowercase emails, this could cause inconsistencies.

**Fix:** Normalize on insert:

```ts
customerEmail: data.customer.email.toLowerCase(),
```

## Info

### IN-01: Duplicate JSON type definitions (`Json` as `unknown` vs structured JSON)

**Files:**
- `src/db/columns.ts:35` (`export type Json = unknown`)
- `src/types/db.ts:1-7` (structured JSON union)

**Issue:** There are now two competing `Json` types. This is not inherently wrong, but it can lead to inconsistent typing/casts across the app.

**Fix:** Prefer one canonical `Json` type (likely `src/types/db.ts` if it’s the stable DTO layer) and re-export/reuse it from other type hubs.

### IN-02: `src/lib/auth/client.ts` baseURL fallback may drift from server-side `BETTER_AUTH_URL`

**File:** `src/lib/auth/client.ts:3-7`  
**Issue:** Client uses `window.location.origin` (good) but falls back to `NEXT_PUBLIC_APP_URL` or localhost when `window` is undefined. If this is ever evaluated server-side (SSR edge cases), mismatch with `BETTER_AUTH_URL` can cause confusing auth behavior.

**Fix:** Keep this client module strictly client-only usage, or align fallback env var naming with the server (`BETTER_AUTH_URL`) via a safe public value if needed.

---

_Reviewed: 2026-04-28T21:58:00Z_  
_Reviewer: Claude (gsd-code-reviewer)_  
_Depth: standard_

