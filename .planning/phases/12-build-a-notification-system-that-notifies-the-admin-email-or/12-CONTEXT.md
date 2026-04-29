# Phase 12: Admin Order Notifications - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

When a customer completes payment (`charge.success` Paystack webhook), the admin (Unoma) receives exactly one email notification per order, including full order details. The system must handle webhook retries without sending duplicate notifications.

This phase does NOT include WhatsApp notifications (deferred to v2) or customer-facing notifications.

</domain>

<decisions>
## Implementation Decisions

### Notification Channel
- **D-01:** Email only for v1. WhatsApp deferred — no Twilio account required for this phase.
- **D-02:** Use Resend as the email provider (via `RESEND_API_KEY` env var).

### Email Content — Full Order Details
- **D-03:** The notification email MUST include all of the following:
  - Order reference (Paystack reference)
  - Customer full name (first + last)
  - Customer email address
  - Customer phone number
  - Full delivery address (street/city + state)
  - Itemised product list: product name, variant (bead size + pack size + thread colour), quantity, unit price
  - Delivery/shipping cost
  - Order total in ₦ (formatted as Naira from kobo)
  - Direct link to the order in the admin panel (`/admin/orders` or `/admin/orders/{reference}`)
- **D-04:** The email should be self-contained — admin can understand and act on the full order without opening the panel.

### Email Format
- **D-05:** Styled HTML email. Use Twinkle Locs brand colours (deep gold, cocoa, cream) and a clean mobile-friendly layout. Not a plain-text email.

### Sender / From Address
- **D-06:** From address is configured via the `RESEND_FROM` env var — do NOT hardcode. Planner must include `RESEND_FROM` in the `user_setup` env var checklist (e.g., `Twinkle Locs <orders@twinklelocs.com>`).

### Admin Recipient Routing
- **D-07:** Prefer `settings.email` from the admin settings table if set and non-empty (trimmed).
- **D-08:** Fallback to `BUSINESS.support.email` (`hello@twinklelocs.com` in `src/lib/config/business.ts`) if settings value is missing.

### Reliability & Idempotency
- **D-09:** Persist notification state in an `order_notifications` DB table with a unique `(order_id, channel)` constraint — prevents duplicates and enables retries.
- **D-10:** Bounded retries: cap at 3 attempts per `(order_id, channel)`. After 3 failed attempts, stop retrying (swallow the error, return 200 to Paystack to stop redelivery).
- **D-11:** On duplicate webhook delivery (order already exists), re-check notification state and attempt send if not yet `sent` — do NOT return early before notification logic.

### Claude's Discretion
- Exact HTML template structure and layout (tables vs. flexbox-style HTML email, specific colour application) — must use brand colours but layout is up to planner.
- Whether to link to `/admin/orders` (list) or `/admin/orders/{reference}` (specific order) — use whichever route exists.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Webhook & Order Creation
- `src/app/api/webhooks/paystack/route.ts` — Paystack webhook handler; where `handleChargeSuccess` lives, current idempotency guard, order insert logic

### Schema & DB
- `src/db/schema.ts` — Drizzle schema; `orders`, `orderItems`, and settings tables; add `orderNotifications` here
- `src/db/index.ts` — Drizzle db instance and re-exports

### Admin Contact Config
- `src/lib/config/business.ts` — `BUSINESS.support.email` fallback constant
- `src/app/(admin)/_components/SettingsForm.tsx` — admin settings form; confirms `email` and `whatsapp_number` keys exist in settings table
- `src/app/api/admin/settings/route.ts` — settings CRUD API; confirms settings key/value model

### Research
- `.planning/phases/12-build-a-notification-system-that-notifies-the-admin-email-or/12-RESEARCH.md` — full technical research; architecture patterns, pitfalls, Resend/Twilio SDK guidance

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/config/business.ts` — `BUSINESS.support.email` is the fallback admin email
- `src/app/(admin)/_components/SettingsForm.tsx` — confirms settings table stores `email` key as the admin notification recipient
- `src/db/index.ts` — Drizzle `db` instance re-exported; use this for all DB access in notification helpers

### Established Patterns
- All server-only secrets use non-`NEXT_PUBLIC_` env vars (Paystack secret is already server-only — follow the same pattern for `RESEND_API_KEY` and `RESEND_FROM`)
- Drizzle ORM is used for all DB operations — use `pgTable`, `uuid`, `text`, `integer`, `timestamp` from `drizzle-orm/pg-core`
- Route Handlers in `src/app/api/` are the pattern for server-side processing

### Integration Points
- `src/app/api/webhooks/paystack/route.ts` → `handleChargeSuccess()` is where notification logic hooks in, after order creation
- Admin panel order routes at `/admin/orders` — include a link here in the email

</code_context>

<specifics>
## Specific Ideas

- The link in the notification email should point to the admin orders page (`/admin/orders`) so Unoma can immediately see and manage the new order.
- Brand colours for the HTML email: deep gold (`#C4973A` or similar), cocoa/dark brown (`#3D2B1F`), warm cream (`#FDF8F0`).
- Email subject line must include the order reference for easy inbox scanning.

</specifics>

<deferred>
## Deferred Ideas

- **WhatsApp notifications**: Twilio WhatsApp send to Unoma's `settings.whatsapp_number` — the `order_notifications` table design supports adding a `'whatsapp'` channel row later without schema changes.
- **Customer order confirmation email**: A separate email to the customer confirming their order — this is a future phase, not part of Phase 12.
- **Admin notification for failed/abandoned orders**: Notify admin when an abandoned order recovers, or when a payment fails — future consideration.

</deferred>

---

*Phase: 12-build-a-notification-system-that-notifies-the-admin-email-or*
*Context gathered: 2026-04-29*
