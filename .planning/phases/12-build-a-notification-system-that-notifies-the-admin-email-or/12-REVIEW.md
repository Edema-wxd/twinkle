---
phase: 12-build-a-notification-system-that-notifies-the-admin-email-or
reviewed: 2026-04-29T15:48:04Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/app/api/webhooks/paystack/route.ts
  - src/lib/notifications/adminOrderEmail.ts
  - src/lib/notifications/notificationState.ts
  - src/db/schema.ts
  - drizzle/0001_order_notifications.sql
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 12: Code Review Report

**Reviewed:** 2026-04-29T15:48:04Z  
**Depth:** standard  
**Files Reviewed:** 5  
**Status:** issues_found

## Summary

Phase 12 introduces a DB-backed notification state (`order_notifications` with unique `(order_id, channel)`), a Resend-based email sender, and Paystack webhook wiring with bounded retries.

The overall structure is solid and matches the phase intent, but there are a few correctness and security-adjacent gaps:
- webhook signature verification should be constant-time and fail closed if secret is missing
- order + order items insertion is not atomic; retries can leave “paid” orders with missing items
- notification sending is not fully idempotent under concurrent webhook deliveries (race can produce duplicate emails)

## Warnings

### WR-01: Paystack secret env var is asserted and may crash handler

**File:** `src/app/api/webhooks/paystack/route.ts:68-75`  
**Issue:** `process.env.PAYSTACK_SECRET_KEY!` is non-null asserted. If it’s missing/misconfigured, `createHmac` will throw and you’ll return 500 (retries) without a clear classification, potentially causing repeated retries/noise.  
**Fix:** Explicitly validate the env var and return a deterministic error before attempting HMAC.

Suggested change (shape):
- If missing secret: log a minimal message and return `500` (or `401` if you treat it as misconfigured auth) without throwing.


### WR-02: Signature comparison is not constant-time (timing attack surface)

**File:** `src/app/api/webhooks/paystack/route.ts:68-75`  
**Issue:** `if (signature !== expectedSignature)` uses string comparison. While this is “usually fine” for many webhooks, it is not constant-time and can theoretically leak information via timing differences.  
**Fix:** Use `crypto.timingSafeEqual` on buffers of equal length.

Concrete approach:
- Reject if header/expected lengths differ
- Compare `Buffer.from(signature, 'utf8')` to `Buffer.from(expectedSignature, 'utf8')` using `timingSafeEqual`


### WR-03: Order header insert + item insert is not atomic; retries can permanently miss items

**File:** `src/app/api/webhooks/paystack/route.ts:145-201`  
**Issue:** The code inserts the `orders` row, then inserts `orderItems` separately. If the first insert succeeds but `db.insert(orderItems)` fails (transient DB error, validation issue, etc.), the outer handler will return non-2xx and Paystack will retry. On retry, the “existing order” path (`existing` branch at `129-138`) will skip item insertion entirely, leaving a “paid” order with **no items** permanently (unless repaired elsewhere).  
**Fix:** Make order+items insertion transactional, or make the retry path “repair” missing items when metadata is present.

Concrete options:
- Wrap `insert(orders)` + `insert(orderItems)` in a DB transaction.
- Add an idempotent item-upsert strategy (e.g., unique constraint per `(order_id, variant_id, ...)` or compute a deterministic line key) and on retry ensure items exist.
- If using transaction is hard, at minimum: if `existing` order found and webhook payload includes `cart_items`, check whether items exist and insert if missing.


### WR-04: Notification state is idempotent in DB but not concurrency-safe for sends

**File:** `src/app/api/webhooks/paystack/route.ts:222-256` and `src/lib/notifications/notificationState.ts:23-70`  
**Issue:** `ensureOrderNotification` guarantees a single DB row per `(order, channel)`, but two concurrent webhook deliveries can still both observe `status !== 'sent'` and attempt a send, resulting in **duplicate emails**. (Unique row != unique send attempt.)  
**Fix:** Introduce an atomic “claim” step before sending, or a DB-side lock/state transition.

Concrete approaches:
- Add `status: 'sending'` and update with `WHERE status IN ('pending','failed')` returning row count; only the winner sends.
- Use `SELECT ... FOR UPDATE` in a transaction around read → send → update (note: holding locks during external call is risky; prefer claim-then-send).
- Use an idempotency key supported by the email provider if available (Resend supports `idempotencyKey` / headers in some SDKs; if used, persist it per notification).

## Info

### IN-01: Webhook logs include the signature value

**File:** `src/app/api/webhooks/paystack/route.ts:79-84`  
**Issue:** On JSON parse failure you log `signature`. While an HMAC digest isn’t a secret in the same way as the key, logging it adds noise and can complicate incident review (it’s also unnecessary to diagnose malformed JSON).  
**Fix:** Log minimal context: request id / reference if available (it isn’t if JSON parse fails), or omit signature entirely.


### IN-02: `paystackPayload` stored with `as unknown` instead of a validated shape

**File:** `src/app/api/webhooks/paystack/route.ts:145-160`  
**Issue:** `paystackPayload: data as unknown` stores unvalidated external input. This is acceptable as an audit trail, but you should be deliberate: either validate/sanitize first or store the raw `event`/`body` string as received.  
**Fix:** Consider storing `{ event, data }` or the raw body string + verified signature header, and/or validate numeric fields (`subtotal`, `shipping_cost`, `amount`) are numbers before using them in math.


### IN-03: Settings key `'email'` for admin notifications may collide with other concepts

**File:** `src/lib/notifications/notificationState.ts:10-21`  
**Issue:** Using `settings.key === 'email'` as the admin notification address is fine if that’s already the project convention, but the key is generic and could be confused with “customer email”, “support email”, etc.  
**Fix:** If the settings table is intended to hold multiple addresses, consider a more explicit key like `'admin_notification_email'` (or document that `'email'` is the admin email in the admin UI/API).

---

_Reviewed: 2026-04-29T15:48:04Z_  
_Reviewer: Claude (gsd-code-reviewer)_  
_Depth: standard_
