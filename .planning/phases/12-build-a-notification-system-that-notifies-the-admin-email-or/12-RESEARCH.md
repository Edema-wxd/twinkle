# Phase 12: Admin Order Notifications (Email or WhatsApp) - Research

**Researched:** 2026-04-28  
**Domain:** Transactional notifications triggered from Paystack webhook (Next.js Route Handler)  
**Confidence:** MEDIUM

## User Constraints (from CONTEXT.md)

No phase `*-CONTEXT.md` file was found for Phase 12 in `.planning/phases/12-build-a-notification-system-that-notifies-the-admin-email-or/`. [VERIFIED: codebase read]

## Summary

Orders are created **server-side** from the Paystack webhook (`POST /api/webhooks/paystack`) after verifying the HMAC signature and applying an idempotency guard on `orders.paystack_reference`. This webhook is the correct “order placed” trigger point for admin notifications because the order does not exist until the webhook handler writes it. [VERIFIED: codebase read — `src/app/api/webhooks/paystack/route.ts`]

The key planning decision is **reliability under webhook retries**: Paystack can retry on non-2xx responses, but the current idempotency guard returns early once an order row exists. If we “send notification after insert” without persisting notification state, a transient email/WhatsApp failure becomes unrecoverable (subsequent webhook deliveries will skip processing). Plan for a minimal persistence layer (e.g., `order_notifications` table) so the webhook can safely retry notification sends when the order exists but the admin hasn’t been notified yet. [VERIFIED: codebase read — webhook idempotency + early return]

**Primary recommendation:** Implement email notifications first (stable + low operational friction), and design the notification interface to add WhatsApp later (Twilio WhatsApp or Meta Cloud API), with persisted delivery state to prevent duplicates and allow retries. [VERIFIED: codebase read + CITED below]

## Current Implementation Reality (Order Placement)

### Where an “order placed” event happens
- **Order creation is webhook-driven**: `src/app/api/webhooks/paystack/route.ts` handles `charge.success`, inserts into `orders` and `order_items`, and marks `abandoned_orders` recovered. [VERIFIED: codebase read]
- **Idempotency is `paystack_reference`**: it checks existing order by `orders.paystack_reference` and returns immediately if found. [VERIFIED: codebase read]

### Implication for notifications
If notification send fails after the order insert, **you cannot rely on Paystack retries** to resend unless you explicitly re-check notification status when the order already exists. [VERIFIED: codebase read]

## Standard Stack

### Core (recommended for Phase 12)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `resend` | 6.12.2 | Transactional email API client | Simple Node SDK; fits Next.js Route Handlers; avoids SMTP complexity. [VERIFIED: npm registry; CITED: https://resend.com/docs/send-with-nodejs] |
| `twilio` | 6.0.0 | WhatsApp message sending (optional) | Straightforward WhatsApp sends via Twilio Messaging API; good for an optional channel. [VERIFIED: npm registry; CITED: https://www.twilio.com/docs/sms/whatsapp/quickstart/node] |

### Supporting (already in project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `next` | 15.x | Route Handler + runtime | Notification send will likely run from `app/api/*` route code. [VERIFIED: codebase read — `package.json`] |
| `drizzle-orm` | 0.45.x | Persist notification status | Use for `order_notifications` table and idempotent state transitions. [VERIFIED: codebase read — `package.json`] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `resend` | `postmark` (4.0.7) | Both are good transactional email. Postmark is mature and feature-rich; choose if you already use Postmark operationally. [VERIFIED: npm registry; CITED: https://postmarkapp.com/send-email/node] |
| Twilio WhatsApp | Meta WhatsApp Cloud API | Potentially cheaper / more direct, but more setup surface. Twilio is often faster to prototype. [ASSUMED] |

**Installation (if adopting Resend/Twilio):**

```bash
npm install resend twilio
```

**Version verification commands (run at implementation time):**

```bash
npm view resend version time.modified
npm view twilio version time.modified
```

## Architecture Patterns

### Pattern 1: Persisted notification state + idempotent send
**What:** Add a durable record of notification attempts (per order, per channel). Webhook processing becomes:
1) ensure order exists, 2) ensure notification row exists, 3) if not “sent”, attempt send, 4) mark “sent” or increment attempts / record last error.  
**When to use:** Always for webhook-triggered messaging, to avoid duplicate sends and to allow safe retries.  
**Why:** Webhooks are retried; external message providers can fail transiently; idempotency must be explicit.

**Concrete recommendation (schema):**
- Table `order_notifications`
  - `id` uuid PK
  - `order_id` FK → `orders.id`
  - `channel` enum/text (`email` | `whatsapp`)
  - `status` (`pending` | `sent` | `failed`)
  - `attempts` int default 0
  - `last_error` text nullable
  - `sent_at` timestamptz nullable
  - **Unique constraint** on (`order_id`, `channel`) for idempotency. [ASSUMED (exact schema), but aligns with current DB usage patterns]

**How it plugs into existing code:**
- The send should be invoked from `handleChargeSuccess()` in `src/app/api/webhooks/paystack/route.ts` after DB inserts, but also reachable when the order already exists (duplicate webhook) and notification is not yet `sent`. [VERIFIED: codebase read]

### Pattern 2: Config source-of-truth for admin contact
**What:** Define where the admin “to” address/number comes from, with clear fallback order.

Existing sources available in codebase:
- `settings` table includes `email` and `whatsapp_number` fields via admin settings UI. [VERIFIED: codebase read — `src/app/(admin)/_components/SettingsForm.tsx`]
- `src/lib/config/business.ts` contains `BUSINESS.support.email` and `BUSINESS.whatsapp.number` (storefront constants). [VERIFIED: codebase read]

**Recommendation:** For admin notification routing, prefer `settings.email` / `settings.whatsapp_number` if set; fallback to `BUSINESS.support.email` / `BUSINESS.whatsapp.number` (or a dedicated env var). [ASSUMED (policy), but grounded in existing config patterns]

### Anti-Patterns to Avoid
- **Best-effort send with no persistence:** leads to permanently missed notifications on transient provider failures. [VERIFIED: codebase read — idempotent early return]
- **Throwing after order insert to “force Paystack retry”:** won’t help once order exists unless you re-enter the notification code path on duplicates. [VERIFIED: codebase read]
- **Sending WhatsApp by constructing `wa.me` links server-side:** `wa.me` is for user click-through, not server-to-user message delivery. Use an API provider for WhatsApp sends. [VERIFIED: docs intent; CITED: https://www.twilio.com/docs/sms/whatsapp/quickstart/node]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|--------|------------|-------------|-----|
| Email delivery | SMTP pipeline / retries / templates from scratch | Resend SDK (or Postmark) | Deliverability + bounces + provider auth are hard; SDK is trivial. [CITED: https://resend.com/docs/send-with-nodejs] |
| WhatsApp delivery | Direct web automation / “wa.me” hack | Twilio WhatsApp Messaging API | WhatsApp sending requires an approved sender + API; Twilio provides supported path. [CITED: https://www.twilio.com/docs/sms/whatsapp/quickstart/node] |
| Idempotency | Ad-hoc in-memory flags | DB unique constraint + persisted status | Serverless/webhook retries demand durable state. [VERIFIED: codebase read] |

## Common Pitfalls

### Pitfall 1: Notification duplicates on webhook retries
**What goes wrong:** Admin receives multiple emails/messages for a single order.  
**Why it happens:** Webhook redelivery + no persisted “already notified” marker.  
**How to avoid:** Unique (`order_id`,`channel`) + `sent_at` check before sending. [VERIFIED: codebase read]

### Pitfall 2: Lost notifications after order insert
**What goes wrong:** Order exists in DB but no admin alert was sent.  
**Why it happens:** Send fails once; subsequent webhook deliveries hit the idempotency early return and do nothing.  
**How to avoid:** On duplicate webhook, if order exists, re-check notification status and send if pending/failed. [VERIFIED: codebase read]

### Pitfall 3: Blocking the webhook response too long
**What goes wrong:** Paystack sees timeouts/non-2xx and retries; creates operational noise.  
**Why it happens:** Slow provider calls in-line.  
**How to avoid:** Keep send payload small and provider call fast; optionally record notification row first, then attempt send; if the provider is slow, accept eventual consistency with retries. [ASSUMED]

## Code Examples (from official sources)

### Resend: send an email (Node.js)
Source: Resend docs. [CITED: https://resend.com/docs/send-with-nodejs]

```ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: "Twinkle Locs <orders@twinklelocs.com>",
  to: "admin@example.com",
  subject: "New order placed",
  html: "<strong>A new order was placed.</strong>",
});
```

### Twilio: send a WhatsApp message (Node.js)
Source: Twilio WhatsApp Quickstart (Node). [CITED: https://www.twilio.com/docs/sms/whatsapp/quickstart/node]

```js
const twilio = require("twilio");
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

await client.messages.create({
  from: "whatsapp:+14155238886",
  to: "whatsapp:+2349118888010",
  body: "New Twinkle Locs order placed. Check the admin panel for details.",
});
```

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Route handlers + provider SDKs | ✓ | v25.2.1 | — |
| npm | Adding SDK deps | ✓ | 11.11.1 | — |

External services required (not available by default):
- **Resend account + API key** (`RESEND_API_KEY`) and a configured “from” domain/address. [CITED: https://resend.com/docs/send-with-nodejs]
- **Twilio account + WhatsApp send capability** (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, WhatsApp-enabled sender). [CITED: https://www.twilio.com/docs/sms/whatsapp/quickstart/node]

## Validation Architecture

No automated test framework is installed (no `test` script / no test dependencies). [VERIFIED: codebase read — `docs/TESTING.md`, `package.json`]

**Suggested minimum verification for Phase 12 (manual):**
- Place a test order (or replay a `charge.success` webhook payload) and confirm:
  - exactly one admin notification per order (even with repeated webhook delivery),
  - notification includes order reference + customer summary + total,
  - notification failure does not create duplicate order headers (keep existing idempotency). [VERIFIED: codebase read for current behavior]

## Security Domain

### Applicable ASVS categories (high-level)
| ASVS Category | Applies | Standard Control |
|---|---:|---|
| V2 Authentication | No (public webhook endpoint) | HMAC verification (already implemented) [VERIFIED: codebase read] |
| V3 Session Management | No | — |
| V4 Access Control | Indirect | Keep admin contacts server-side; do not expose notification secrets to client bundles. [ASSUMED] |
| V5 Input Validation | Yes | Validate provider config + recipient values; do not trust webhook metadata for routing. [ASSUMED] |
| V6 Cryptography | Yes | HMAC-SHA512 signature verification (already implemented). [VERIFIED: codebase read] |

### Threat patterns to plan for
- **Webhook replay / duplication:** mitigate via idempotency + notification state. [VERIFIED: codebase read]
- **Secret leakage:** ensure API keys are server-only env vars (no `NEXT_PUBLIC_*`). [VERIFIED: codebase read — Paystack secret already server-only]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Twilio is the preferred WhatsApp provider (vs. Meta Cloud API) for this project’s Phase 12 scope | Standard Stack / Alternatives | Rework needed if the business prefers Meta direct integration or already has an existing provider account |
| A2 | Adding an `order_notifications` table (or `orders.admin_notified_at`) is acceptable schema change in this phase | Architecture Patterns | If schema changes are constrained, we may need a different retry mechanism (e.g., job queue) |
| A3 | Notification routing should prefer `settings` table contact values with fallback to `BUSINESS` constants | Architecture Patterns | Wrong routing could send notifications to the wrong recipient; needs explicit confirmation in planning |

## Open Questions (RESOLVED)

1. **Which channel is required for v1: email, WhatsApp, or both?**
   - **RESOLVED:** Email is required for v1. WhatsApp is optional/out-of-scope unless a provider is already configured.

2. **What should “admin recipient” be?**
   - What we know: Admin settings UI already has `email` and `whatsapp_number` keys. [VERIFIED: codebase read]
   - **RESOLVED:** Reuse `settings.email` and `settings.whatsapp_number` as *internal admin notification recipients* (not separate dedicated keys).

3. **How much reliability is required?**
   - What we know: Webhook idempotency currently prevents duplicates but also prevents retry logic unless designed.
   - **RESOLVED:** Target **~99% reliability** by persisting per-order notification state and allowing bounded retries on later webhook deliveries (and/or a manual resend path).

## Sources

### Primary (HIGH confidence)
- `src/app/api/webhooks/paystack/route.ts` — webhook signature verification, order creation, idempotency. [VERIFIED: codebase read]
- `src/app/(admin)/_components/SettingsForm.tsx` — settings keys include `email` and `whatsapp_number`. [VERIFIED: codebase read]
- `src/lib/config/business.ts` — fallback business email/WhatsApp constants. [VERIFIED: codebase read]
- npm registry versions:
  - `resend@6.12.2` (time.modified 2026-04-20) [VERIFIED: npm registry]
  - `twilio@6.0.0` (time.modified 2026-04-28) [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- Resend “Send with Node.js” docs: `https://resend.com/docs/send-with-nodejs` [CITED: https://resend.com/docs/send-with-nodejs]
- Twilio WhatsApp Quickstart (Node): `https://www.twilio.com/docs/sms/whatsapp/quickstart/node` [CITED: https://www.twilio.com/docs/sms/whatsapp/quickstart/node]
- Postmark Node sending guide: `https://postmarkapp.com/send-email/node` [CITED: https://postmarkapp.com/send-email/node]

## Metadata

**Confidence breakdown:**
- Standard stack: **MEDIUM** — versions verified; final provider choice depends on which accounts/credentials the business will use.
- Architecture: **HIGH** — webhook + DB insert flow and idempotency behavior verified in code.
- Pitfalls: **HIGH** — derived directly from current webhook control flow and webhook retry reality.

**Valid until:** 2026-05-28 (re-check npm versions + provider docs monthly).

