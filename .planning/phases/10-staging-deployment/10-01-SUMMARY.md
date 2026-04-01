---
phase: 10-staging-deployment
plan: "01"
subsystem: infra
tags: [supabase, paystack, whatsapp, env-vars, sitemap, build]

# Dependency graph
requires:
  - phase: 05-cart-checkout
    provides: Paystack webhook handler and order confirmation page
  - phase: 07-content-pages
    provides: Shipping page and About section
  - phase: 09-seo
    provides: sitemap.ts dynamic route

provides:
  - Correct SUPABASE_SERVICE_ROLE_KEY env var usage across all service-role clients
  - BUSINESS.whatsapp.url() used in all WhatsApp CTAs (no hardcoded numbers)
  - Audited and complete sitemap.ts staticRoutes with audit comment
  - Clean production build confirming TypeScript correctness

affects:
  - 10-02-PLAN (Vercel deployment env var setup — canonical env var name now confirmed)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - BUSINESS config singleton is the single source of truth for all WhatsApp URLs
    - Service-role Supabase client uses SUPABASE_SERVICE_ROLE_KEY (not SUPABASE_SERVICE_ROLE_KEY_SECRET)

key-files:
  created: []
  modified:
    - src/app/api/webhooks/paystack/route.ts
    - src/app/orders/[reference]/page.tsx
    - src/app/shipping/page.tsx
    - src/components/about/AboutSection.tsx
    - src/app/sitemap.ts

key-decisions:
  - "SUPABASE_SERVICE_ROLE_KEY is the canonical env var name — matches admin.ts and must be used in all service-role createClient calls"
  - "BUSINESS.whatsapp.url() is the sole constructor for wa.me links — no inline string construction allowed"
  - "sitemap.ts staticRoutes audited 2026-04-01: /checkout excluded as transactional (no SEO value); /cart and /orders/ also excluded"
  - "NEXT_PUBLIC_PAYSTACK_SECRET_KEY confirmed absent from all source files — only in .env.local as PAYSTACK_SECRET_KEY"

patterns-established:
  - "Env var audit: grep -r SUPABASE_SERVICE_ROLE_SECRET src/ must return zero matches before any deployment"
  - "WhatsApp links: always use BUSINESS.whatsapp.url(message?) — never inline wa.me string construction"

# Metrics
duration: 8min
completed: 2026-04-01
---

# Phase 10 Plan 01: Pre-Deployment Code Fixes Summary

**Env var rename (SERVICE_ROLE_SECRET -> SERVICE_ROLE_KEY), BUSINESS.whatsapp.url() substitution in shipping + about, and sitemap staticRoutes audit — build passes clean.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-01T00:00:00Z
- **Completed:** 2026-04-01T00:08:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Fixed wrong env var name `SUPABASE_SERVICE_ROLE_SECRET` in webhook handler and order confirmation page — both now match the canonical `SUPABASE_SERVICE_ROLE_KEY` used in `admin.ts`
- Replaced hardcoded `2348000000000` placeholder in `shipping/page.tsx` and `AboutSection.tsx` with `BUSINESS.whatsapp.url()` calls
- Audited all `src/app/**/page.tsx` files to confirm sitemap.ts staticRoutes is complete; added audit comment documenting intentional exclusions
- `npm run build` passes with exit code 0 — 44 routes compiled cleanly

## Task Commits

Each task was committed atomically:

1. **Task 1: Consolidate SUPABASE_SERVICE_ROLE_SECRET to SUPABASE_SERVICE_ROLE_KEY** - `a7196de` (fix)
2. **Task 2: Replace hardcoded 2348000000000 with BUSINESS.whatsapp.url()** - `62ae1bd` (fix)
3. **Task 3: Audit and complete sitemap.ts staticRoutes** - `72291af` (chore)

**Plan metadata:** (this commit)

## Files Created/Modified

- `src/app/api/webhooks/paystack/route.ts` - Env var name corrected to SUPABASE_SERVICE_ROLE_KEY
- `src/app/orders/[reference]/page.tsx` - Env var name corrected to SUPABASE_SERVICE_ROLE_KEY
- `src/app/shipping/page.tsx` - Import BUSINESS; use BUSINESS.whatsapp.url(message) for intl shipping CTA
- `src/components/about/AboutSection.tsx` - Import BUSINESS; use BUSINESS.whatsapp.url() for contact href
- `src/app/sitemap.ts` - Audit comment added above staticRoutes

## Decisions Made

- **SUPABASE_SERVICE_ROLE_KEY is canonical** — `admin.ts` is the reference; both inline service-role clients now match it. Vercel env var must be named `SUPABASE_SERVICE_ROLE_KEY`.
- **BUSINESS.whatsapp.url() is the sole WhatsApp URL constructor** — any new WhatsApp CTA must import from `@/lib/config/business` rather than building wa.me strings inline.
- **sitemap.ts excludes /checkout as transactional** — plan originally only called out /cart and /orders/ but /checkout was also found during audit and confirmed correctly absent from sitemap.
- **NEXT_PUBLIC_PAYSTACK_SECRET_KEY confirmed absent from source** — Paystack secret is correctly named `PAYSTACK_SECRET_KEY` (no NEXT_PUBLIC_ prefix); secret is never exposed to the browser. No source file ever referenced the NEXT_PUBLIC_ variant.

## Deviations from Plan

None — plan executed exactly as written. The plan's artifact check for `/newsletter` in sitemap.ts was not applicable because `/newsletter` is a newsletter signup embedded in the Footer component, not a standalone page route. The audit confirmed all actual public page routes are covered.

## Issues Encountered

None.

## User Setup Required

**Vercel environment variables** — ensure the following env var names are used when configuring the Vercel project:
- `SUPABASE_SERVICE_ROLE_KEY` (not `SUPABASE_SERVICE_ROLE_SECRET`)
- `PAYSTACK_SECRET_KEY` (not `NEXT_PUBLIC_PAYSTACK_SECRET_KEY`)

These are the canonical names confirmed by this audit.

## Next Phase Readiness

- Build is clean — ready to proceed to 10-02 (Vercel project creation and deployment)
- Env var names are confirmed: configure Vercel dashboard with `SUPABASE_SERVICE_ROLE_KEY` and `PAYSTACK_SECRET_KEY`
- No blockers

---
*Phase: 10-staging-deployment*
*Completed: 2026-04-01*
