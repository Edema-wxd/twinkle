---
phase: 10-staging-deployment
plan: "02"
subsystem: infra
tags: [vercel, deployment, staging, env-vars, nextjs]

requires:
  - phase: 10-01
    provides: Clean build with all pre-deployment code fixes applied

provides:
  - Vercel project linked to GitHub main branch with auto-deploy on push
  - All 7 environment variables configured in Vercel Production environment
  - Supabase redirect URL allowlist updated for staging domain
  - Live staging URL at https://twinkle-mocha.vercel.app

affects: [10-03, dns-cutover]

tech-stack:
  added: [vercel]
  patterns: [staging-first deployment — validate before DNS cutover]

key-files:
  created: []
  modified: []

key-decisions:
  - "Staging URL is https://twinkle-mocha.vercel.app (not twinkle-locs.vercel.app)"
  - "NEXT_PUBLIC_SITE_URL must be updated to production domain before DNS cutover redeploy"
  - "Paystack test keys used for staging — live keys swapped at DNS cutover"

self-check: PASSED
---

## What Was Built

Vercel project created and linked to the GitHub `twinkle` repository. All 7 environment variables configured in the Production environment before the first build. Supabase authentication redirect URL allowlist updated to include the staging domain.

## Staging URL

**https://twinkle-mocha.vercel.app**

## Local Build Verification

Local production build: **PASS** — 35 pages generated, no TypeScript errors, no missing modules. Build compiled in 14.1s.

## Environment Variables Confirmed Set

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`
- `PAYSTACK_SECRET_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_WHATSAPP_NUMBER`

## Accessibility Checks

- Homepage loads with hero section — no console errors
- `/catalog` loads with products visible (Supabase connection confirmed)
- `/admin` redirects to login page correctly
- `/sitemap.xml` shows staging URLs (not localhost)

## Issues

None.
