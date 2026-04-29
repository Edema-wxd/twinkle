---
phase: 12
slug: build-a-notification-system-that-notifies-the-admin-email-or
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-28
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none (repo does not have an automated test framework configured) |
| **Config file** | none |
| **Quick run command** | `npm run lint` |
| **Full suite command** | `npm run lint && npm run build` |
| **Estimated runtime** | ~60–180 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run lint`
- **After every plan wave:** Run `npm run lint && npm run build`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | NOTIF-01 | T-12-01 | Idempotent delivery state enforced by unique `(order_id, channel)` | static | `npm run lint` | ✅ | ⬜ pending |
| 12-01-02 | 01 | 1 | NOTIF-02 | T-12-01 | Schema push completed; artifacts reflect `order_notifications` | static | `npm run lint` | ✅ | ⬜ pending |
| 12-02-01 | 02 | 2 | NOTIF-03 | T-12-04/T-12-07 | Email send code is server-only; failures recorded | static | `npm run lint && npm run build` | ✅ | ⬜ pending |
| 12-02-02 | 02 | 2 | NOTIF-04 | T-12-04/T-12-07 | Webhook retry behavior bounded; no duplicate sends | static | `npm run lint && npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all Phase 12 verification (lint + build). No Wave 0 setup required.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Admin receives an email when a real Paystack `charge.success` webhook is delivered | NOTIF-03 | Requires live Paystack webhook + email provider credentials | Place a real test order; confirm exactly one admin email arrives and `order_notifications.status` becomes `sent` |
| Webhook redelivery retries up to 3 times, then stops retrying | NOTIF-04 | Depends on provider failure simulation + Paystack retry behavior | Temporarily set an invalid `RESEND_API_KEY`, trigger a test order, confirm attempts increment and webhook stops throwing after 3 attempts |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
