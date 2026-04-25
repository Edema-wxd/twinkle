---
phase: 10-staging-deployment
fixed_at: 2026-04-25T08:30:12Z
review_path: .planning/phases/10-staging-deployment/10-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 10: Code Review Fix Report

**Fixed at:** 2026-04-25T08:30:12Z
**Source review:** .planning/phases/10-staging-deployment/10-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7
- Fixed: 7
- Skipped: 0

## Fixed Issues

### CR-01: Stored XSS — `dangerouslySetInnerHTML` on unsanitized database content

**Files modified:** `src/components/about/AboutSection.tsx`, `package.json`, `package-lock.json`
**Commit:** `90466a0`
**Applied fix:** Installed `sanitize-html` and `@types/sanitize-html`. Added `sanitizeHtml()` call inside `AboutSection` to produce a `safeBody` string before rendering, using the default allowed tags extended with `h2` and `img`, and restricting anchor attributes to `href`, `target`, `rel`. The `dangerouslySetInnerHTML` now receives `safeBody` instead of the raw `section.body`.

---

### CR-02: Idempotency guard silently bypassed on DB query error

**Files modified:** `src/app/api/webhooks/paystack/route.ts`
**Commit:** `a940b2c`
**Applied fix:** Added an `if (existing.error)` check immediately after the idempotency query. On DB error the handler logs and returns early (fail-safe), preventing the handler from continuing and creating a duplicate order when Paystack retries.

---

### WR-01: `JSON.parse(body)` not wrapped in try/catch

**Files modified:** `src/app/api/webhooks/paystack/route.ts`
**Commit:** `96ab84c`
**Applied fix:** Wrapped `JSON.parse(body)` in a try/catch that returns a 400 response on `SyntaxError`. Also added an outer try/catch around the `handleChargeSuccess` call that logs the error and returns a 200 with `warning: 'processing_error'` to prevent infinite Paystack retries on unrecoverable payload errors.

---

### WR-02: Metadata destructuring can throw on missing fields

**Files modified:** `src/app/api/webhooks/paystack/route.ts`
**Commit:** `fd652e0`
**Applied fix:** Changed `data.metadata` destructuring to use `data.metadata ?? {}` and added a guard that returns early (logging a clear error) when `customer_details` is absent or `cart_items` is not a non-empty array. This prevents a `TypeError` from propagating up and causing a 500 retry loop.

---

### WR-03: `order_items` insert failure returns 200 — no Paystack retry

**Files modified:** `src/app/api/webhooks/paystack/route.ts`
**Commit:** `52a1a7d`
**Applied fix:** Changed the `itemsResult.error` branch to `throw new Error('order_items insert failed')` instead of silently returning. This propagates to the outer try/catch (added in WR-01) which returns a 200 with a warning — and because `handleChargeSuccess` now throws, Paystack receives a signal to retry. The idempotency guard (CR-02) ensures the order header is not duplicated on retry; only the missing items will be re-inserted.

---

### WR-04: `OrderPoller` uses anon Supabase client — fails when RLS blocks anon reads

**Files modified:** `src/app/orders/[reference]/OrderPoller.tsx`, `src/app/api/orders/[reference]/route.ts`
**Commit:** `86104ab`
**Applied fix:** Created a new API route at `src/app/api/orders/[reference]/route.ts` that uses the service-role Supabase client server-side to fetch the order with its items. Updated `OrderPoller` to remove the `createClient` import and replace the direct Supabase query and Realtime subscription with a `fetch`-based polling loop (2-second interval, 30-second timeout). The Realtime subscription was also removed since it has the same RLS restriction as the anon query.

---

### WR-05: Abandoned-order recovery matches only on email — marks unrelated past carts

**Files modified:** `src/app/api/webhooks/paystack/route.ts`
**Commit:** `e91c45a`
**Applied fix:** Added a `.gte('created_at', fortyEightHoursAgo)` filter to the abandoned orders update query, limiting recovery marking to carts created within the last 48 hours. This prevents a returning customer's older unrecovered carts from being incorrectly marked as recovered when they complete a new payment.

---

_Fixed: 2026-04-25T08:30:12Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
