---
phase: 12-build-a-notification-system-that-notifies-the-admin-email-or
plan: 02
subsystem: notifications
tags:
  - paystack-webhook
  - resend
  - idempotency
  - retries
requires:
  - "12-01 (order_notifications table)"
provides:
  - "Idempotent admin order email notifications (bounded retries)"
tech_stack:
  - Next.js App Router (server routes)
  - Drizzle ORM (Postgres)
  - Resend SDK
key_files:
  created:
    - src/lib/notifications/notificationState.ts
    - src/lib/notifications/adminOrderEmail.ts
    - eslint.config.mjs
  modified:
    - src/app/api/webhooks/paystack/route.ts
    - package.json
    - package-lock.json
    - src/app/not-found.tsx
commits:
  - c372b17: "feat(12-02): add resend admin email + notification state"
  - 588b561: "feat(12-02): send admin email on webhook with idempotent retries"
completed_at: "2026-04-29"
---

# Phase 12 Plan 02: Notification email + persisted idempotency

Send an idempotent admin email notification when an order is created via the Paystack `charge.success` webhook, with DB-backed state and bounded retries to avoid duplicate sends on webhook redelivery.

## What Shipped

- **DB-backed notification state helpers**: `ensureOrderNotification`, `markOrderNotificationSent`, `markOrderNotificationFailed`, and `getAdminNotificationEmail` implemented against `order_notifications` + `settings`.
- **Resend admin email sender**: `sendAdminOrderEmail` with hard env guards (`RESEND_API_KEY`, `RESEND_FROM`) and an order-summary email body.
- **Webhook wiring + retry control**:
  - Duplicate webhook deliveries **no longer return early**; they reuse the existing order row and proceed to the notification path.
  - Notification attempts are **idempotent** (`status === 'sent'` short-circuits) and **bounded** (`attempts >= 3` stops throwing to end Paystack retries).
  - Failures are recorded with a truncated error and attempts counter; transient failures rethrow until the cap is reached.

## Verification

- `npm run lint` passes (with existing warnings unrelated to this plan).
- `npm run build` passes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added flat ESLint config to unblock `next lint`**
- **Issue:** `npm run lint` triggered an interactive Next.js ESLint setup prompt (non-interactive execution blocker).
- **Fix:** Added `eslint.config.mjs` using `FlatCompat` to extend `next/core-web-vitals` + `next/typescript`.
- **Commit:** `c372b17`

## Security / Threat Model Coverage

- **T-12-04 Provider outage**: Attempts are persisted and capped at 3; retries occur only via webhook redelivery until success/cap.
- **T-12-05 No delivery record**: `order_notifications` row is ensured per `(order_id, channel)`.
- **T-12-06 Secret leakage**: `RESEND_API_KEY`/`RESEND_FROM` are referenced only in `src/lib/notifications/*`; webhook logs avoid payload + secrets.
- **T-12-07 Duplicate notifications**: Unique `(order_id, channel)` + `status === 'sent'` guard prevents duplicates.

## Self-Check

- **Files created/modified**: Present in workspace.
- **Commits**: `c372b17` and `588b561` present in git history.

