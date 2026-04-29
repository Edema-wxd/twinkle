# Phase 12: Admin Order Notifications - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-29
**Phase:** 12-build-a-notification-system-that-notifies-the-admin-email-or
**Areas discussed:** Channel scope, Email body content, Email format, From address

---

## Channel Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Email only | Use Resend — simple, no extra accounts. WhatsApp later. | ✓ |
| Email + WhatsApp | Email via Resend + WhatsApp via Twilio to Unoma's settings number. Requires Twilio account. | |

**User's choice:** Email only (Recommended)
**Notes:** WhatsApp deferred to v2. The `order_notifications` table is designed to support a `'whatsapp'` channel row without schema changes when needed.

---

## Email Body Content

| Option | Description | Selected |
|--------|-------------|----------|
| Summary + admin link | Reference, customer name, email, phone, delivery state, item count, total + link to /admin/orders. | |
| Full order details | Everything in summary + full delivery address + itemised product list (name, variant, qty, price). Self-contained. | ✓ |
| Minimal summary | Just order reference and total. Admin opens panel for details. | |

**User's choice:** Full order details
**Notes:** Admin email should be self-contained — Unoma can read and act on the full order from her phone without opening the admin panel.

---

## Email Format

| Option | Description | Selected |
|--------|-------------|----------|
| Styled HTML | Clean HTML with Twinkle Locs branding — looks professional on mobile. | ✓ |
| Plain text | No styling, universal compatibility, easier to build. | |

**User's choice:** Styled HTML
**Notes:** Use brand colours (deep gold, cocoa, cream). Mobile-friendly layout.

---

## From Address

| Option | Description | Selected |
|--------|-------------|----------|
| orders@twinklelocs.com | Order-specific sender. Requires Resend domain verification. | |
| noreply@twinklelocs.com | Generic no-reply. Same domain verification. | |
| Set via RESEND_FROM env var | Don't hardcode — configure per environment. | ✓ |

**User's choice:** Set via RESEND_FROM env var
**Notes:** Planner to include `RESEND_FROM` in user_setup env var checklist.

---

## Claude's Discretion

- Exact HTML template structure (tables vs flexbox-style, specific layout) — must use brand colours but layout details are up to planner
- Whether to link to `/admin/orders` (list) or `/admin/orders/{reference}` (order detail) — use whichever route exists

## Deferred Ideas

- WhatsApp notifications via Twilio (v2)
- Customer-facing order confirmation email (future phase)
- Admin notifications for failed/abandoned orders (future consideration)
