---
phase: 12-build-a-notification-system-that-notifies-the-admin-email-or
verified: 2026-04-29T15:51:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "Duplicate webhook deliveries (including concurrent deliveries) do not send duplicate admin email notifications for the same order"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Single send on retry/concurrency"
    expected: "Replaying the same `charge.success` payload multiple times (including concurrently) results in at most one admin email, and the `order_notifications` row ends in `status='sent'`."
    why_human: "Requires live Paystack/Resend credentials and observing side effects (email receipt + DB state under concurrency)."
  - test: "Retry cap behavior"
    expected: "With email sending failing, retries occur up to 3 attempts for the same order/channel; after attempt 3 the webhook stops throwing (Paystack should stop retrying) and the row records `attempts` + `last_error`."
    why_human: "Requires invoking the webhook repeatedly and observing both HTTP responses and the persisted attempt counter."
---

# Phase 12: Admin Notification System Verification Report

**Phase Goal:** Build a notification system that notifies the admin email on order placement (via Paystack webhook), with durable idempotent state and safe retries.
**Verified:** 2026-04-29T15:51:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | When a Paystack `charge.success` webhook creates (or redelivers) an order, the system can record notification delivery state for that order | ✓ VERIFIED | `order_notifications` table + `ensureOrderNotification()` persisted per `(orderId, channel)`; webhook always executes notification path even when order already exists (`src/app/api/webhooks/paystack/route.ts` + `src/lib/notifications/notificationState.ts`). |
| 2 | Notification state is durable and idempotent per (order, channel) at the database level | ✓ VERIFIED | Unique constraint `order_notifications_order_id_channel_unique` on (`order_id`,`channel`) exists in migration and schema (`drizzle/0001_order_notifications.sql`, `src/db/schema.ts`). |
| 3 | When an order is created via Paystack webhook, the admin receives an email notification with order details | ✓ VERIFIED (code-path) | Webhook calls `sendAdminOrderEmail()` with order reference + customer fields + itemCount + total; sender uses Resend SDK (`src/app/api/webhooks/paystack/route.ts`, `src/lib/notifications/adminOrderEmail.ts`). Actual delivery requires valid `RESEND_API_KEY` + `RESEND_FROM`. |
| 4 | If the email provider fails transiently, subsequent webhook deliveries can retry until success (bounded attempts) | ✓ VERIFIED | Failures increment attempts in DB and rethrow until attempts reach 3; after 3, handler stops throwing to end Paystack retries (`markOrderNotificationFailed` + attempts cap in `handleChargeSuccess`). |
| 5 | Duplicate webhook deliveries (including concurrent deliveries) do not send duplicate admin email notifications for the same order | ✓ VERIFIED (code-path) | Webhook now performs an atomic claim (`claimOrderNotificationSend`) before sending; only the request that transitions status to `'sending'` proceeds, preventing concurrent double-sends (`src/lib/notifications/notificationState.ts`, `src/app/api/webhooks/paystack/route.ts`). |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---------|----------|--------|---------|
| `src/db/schema.ts` | Drizzle `order_notifications` table definition with unique `(order_id, channel)` | ✓ VERIFIED | `orderNotifications` defined with `unique(...).on(t.orderId, t.channel)`. |
| `drizzle/0001_order_notifications.sql` | SQL migration for `order_notifications` | ✓ VERIFIED | Table + unique constraint + FK present. |
| `src/lib/notifications/notificationState.ts` | DB-backed idempotent notification state helpers | ✓ VERIFIED | Exports `NotificationChannel`, `getAdminNotificationEmail`, `ensureOrderNotification`, `claimOrderNotificationSend`, `markOrderNotificationSent`, `markOrderNotificationFailed`. |
| `src/lib/notifications/adminOrderEmail.ts` | Resend-based admin order email sender | ✓ VERIFIED | Uses `new Resend(process.env.RESEND_API_KEY)`; enforces `RESEND_FROM`; formats ₦ total; builds text + html. |
| `src/app/api/webhooks/paystack/route.ts` | Webhook handler invoking idempotent notification send | ✓ VERIFIED | Calls `ensureOrderNotification` + `claimOrderNotificationSend` + `sendAdminOrderEmail` + state marking; bounded retries present. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/api/webhooks/paystack/route.ts` | `order_notifications` (db table) | `ensureOrderNotification` / `claimOrderNotificationSend` / `markOrderNotification*` | ✓ WIRED | Direct calls exist in `handleChargeSuccess`. |
| `src/app/api/webhooks/paystack/route.ts` | `src/lib/notifications/notificationState.ts` | function calls | ✓ WIRED | Imports + calls verified. |
| `src/lib/notifications/adminOrderEmail.ts` | Resend SDK/API | `new Resend(apiKey)` + `resend.emails.send(...)` | ✓ WIRED | Env guards + send call verified. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---------|---------------|--------|--------------------|--------|
| `notificationState.ts` | admin email recipient | `settings.key === 'email'` → fallback `BUSINESS.support.email` | Yes | ✓ FLOWING |
| `paystack/route.ts` | orderId + order details | `orders` insert/select + webhook metadata | Yes | ✓ FLOWING |
| `adminOrderEmail.ts` | email payload | webhook-built input → Resend API | Yes (given env vars) | ✓ FLOWING |

### Behavioral Spot-Checks

Skipped (no side-effect-free way to validate real Resend delivery or Paystack retry behavior from static verification alone).

### Requirements Coverage

No formal requirement IDs were provided in the phase request. (PLAN files reference `NOTIF-*` IDs, but these are not present in `.planning/REQUIREMENTS.md`.)

### Anti-Patterns Found

No TODO/FIXME/placeholder stubs found in the reviewed notification modules.

Notable review-adjacent risks (not counted as goal-blocking gaps here):
- `PAYSTACK_SECRET_KEY!` non-null assertion and non-constant-time signature compare (`signature !== expectedSignature`) in `src/app/api/webhooks/paystack/route.ts`.
- Order header + item inserts are not atomic; a retry can leave a paid order with missing items if `orderItems` insert fails after the order insert.

## Human Verification Required

1. **Single send on retry**
   - **Test:** Replay the same `charge.success` payload multiple times (including back-to-back) and confirm exactly one admin email is received.
   - **Expected:** One email max per order reference; DB row shows `status='sent'`.
   - **Why human:** Requires live Paystack/Resend credentials and observing side effects.

2. **Retry cap behavior**
   - **Test:** Temporarily misconfigure `RESEND_API_KEY` and replay webhook 3+ times.
   - **Expected:** First 2 attempts return 500 (to trigger Paystack retry), third attempt returns 200 and stops retries; DB row `attempts` increments and `last_error` set.
   - **Why human:** Requires executing webhook requests and observing Paystack retry semantics.

## Gaps Summary

The phase’s core must-haves are now satisfied in code: notification state is durable and idempotent, retries are bounded, and the webhook’s send path is concurrency-safe via an atomic “claim send” step that prevents duplicate emails under concurrent deliveries. What remains is human validation of live, side-effectful behavior (actual email delivery + Paystack retry semantics) in a real environment.

---
_Verified: 2026-04-29T15:51:00Z_
_Verifier: Claude (gsd-verifier)_

