---
phase: 10-staging-deployment
plan: "03"
subsystem: infra
tags: [smoke-test, staging, vercel, paystack, supabase, admin]

requires:
  - phase: 10-02
    provides: Live staging URL at https://twinkle-mocha.vercel.app

provides:
  - Confirmed staging site is fully functional and ready for DNS cutover
  - Verified end-to-end purchase flow on staging
  - Confirmed admin panel works on staging
  - DNS cutover checklist documented

affects: [dns-cutover, production-launch]

tech-stack:
  added: []
  patterns: [staging smoke test protocol before DNS cutover]

key-files:
  created: []
  modified: []

key-decisions:
  - "Site declared READY FOR DNS CUTOVER — all three smoke test suites passed"
  - "Paystack test webhook registered at https://twinkle-mocha.vercel.app/api/webhooks/paystack"
  - "Live keys and NEXT_PUBLIC_SITE_URL update required before DNS cutover redeploy"

self-check: PASSED
---

## What Was Built

Structured smoke test run against https://twinkle-mocha.vercel.app confirming the site is ready for DNS cutover to twinklelocs.com.

## Staging URL

**https://twinkle-mocha.vercel.app**

## Smoke Test Results

| Test | Status |
|------|--------|
| Paystack test webhook registered | PASS |
| Visual quality check (all 7 pages) | PASS |
| Full purchase flow (cart → Paystack → order confirmation → Supabase row) | PASS |
| Admin flow (login, orders, product creation, logout) | PASS |

## Readiness Decision

**READY FOR DNS CUTOVER**

## DNS Cutover Steps (Remaining)

1. Upgrade Vercel plan to Pro
2. Swap Paystack test keys → live keys in Vercel env vars
3. Register live webhook URL in Paystack Live Mode
4. Update `NEXT_PUBLIC_SITE_URL` → `https://twinklelocs.com`
5. Add `twinklelocs.com` and `www.twinklelocs.com` in Vercel Domains
6. Update DNS records at registrar
7. Trigger Vercel redeploy after DNS propagates

## Issues

None.
