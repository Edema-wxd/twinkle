---
phase: 10-staging-deployment
verified: 2026-04-24T12:00:00Z
status: gaps_found
score: 7/8 must-haves verified
overrides_applied: 0
gaps:
  - truth: "sitemap.xml shows staging URLs (not localhost) with valid URL format"
    status: partial
    reason: "Sitemap is accessible and shows staging URLs, but all sub-routes have a double-slash (e.g. https://twinkle-mocha.vercel.app//catalog). Root cause: NEXT_PUBLIC_SITE_URL was set with a trailing slash in Vercel env config. The sitemap.ts code does `${BASE}/catalog` — if BASE ends with '/', this produces '//catalog'. Technically malformed per the sitemap spec; Google Search Console would flag these as invalid URLs."
    artifacts:
      - path: "Vercel env config (NEXT_PUBLIC_SITE_URL)"
        issue: "Value set to 'https://twinkle-mocha.vercel.app/' (trailing slash) instead of 'https://twinkle-mocha.vercel.app'"
    missing:
      - "Remove trailing slash from NEXT_PUBLIC_SITE_URL in Vercel environment variable settings"
      - "Trigger a Vercel redeploy after fixing the env var"
      - "Confirm sitemap.xml no longer contains double-slash URLs (e.g. /catalog, not //catalog)"
human_verification:
  - test: "Full purchase flow"
    expected: "Add to cart -> checkout -> Paystack test card -> order confirmation page renders; order row appears in Supabase with status=paid; Paystack webhook delivery shows success"
    why_human: "Requires browser interaction, Paystack test card payment, and live Supabase write — cannot be triggered programmatically without running auth'd sessions and real payment flows. Developer self-reported PASS in 10-03-SUMMARY.md."
  - test: "Admin flow"
    expected: "Login to /admin, see test order in orders list, update order status, create a product and confirm it appears on storefront, logout and confirm auth guard redirects"
    why_human: "Requires interactive browser session with admin credentials and live Supabase reads/writes. Developer self-reported PASS in 10-03-SUMMARY.md."
  - test: "No console errors, broken images, or broken links on homepage, /catalog, product detail page"
    expected: "Browser DevTools Console shows zero red errors; all product images render; navigation links work"
    why_human: "Requires a real browser session to inspect console and visual rendering. Developer self-reported PASS in 10-03-SUMMARY.md."
---

# Phase 10: Staging Deployment Verification Report

**Phase Goal:** The complete site is deployed to a Vercel staging URL and verified end-to-end — ready for DNS cutover to twinklelocs.com
**Verified:** 2026-04-24T12:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | No file reads process.env.NEXT_PUBLIC_PAYSTACK_SECRET_KEY | VERIFIED | `grep -r "NEXT_PUBLIC_PAYSTACK_SECRET_KEY" src/` returns no matches |
| 2 | SUPABASE_SERVICE_ROLE_SECRET is replaced by SUPABASE_SERVICE_ROLE_KEY everywhere | VERIFIED | `grep -r "SUPABASE_SERVICE_ROLE_SECRET" src/` returns no matches; SUPABASE_SERVICE_ROLE_KEY found in webhook route, orders page, admin.ts, save-intent route (4 files) |
| 3 | No hardcoded placeholder 2348000000000 exists in any source file | VERIFIED | `grep -r "2348000000000" src/` returns no matches |
| 4 | sitemap.ts staticRoutes covers all public routes added through Phase 9 | VERIFIED | All 6 public routes present (/, /catalog, /about, /faq, /shipping, /blog) plus dynamic product and blog routes; /cart, /checkout, /orders/ correctly excluded |
| 5 | Site is accessible at a Vercel staging URL without authentication gates | VERIFIED | HTTP 200 on https://twinkle-mocha.vercel.app/; HTTP 307 on /admin (redirects to login, not a public gate) |
| 6 | sitemap.xml shows staging URLs with valid URL format | PARTIAL | Sitemap is live and shows staging domain (not localhost), but all sub-route URLs are malformed with double-slash: https://twinkle-mocha.vercel.app//catalog, //about, etc. Root cause: NEXT_PUBLIC_SITE_URL has trailing slash in Vercel env. |
| 7 | Full purchase flow completes end-to-end on staging | HUMAN-VERIFIED | Developer self-reported PASS in 10-03-SUMMARY.md after running smoke test with Paystack test card |
| 8 | Admin can log in and manage products/orders on staging | HUMAN-VERIFIED | Developer self-reported PASS in 10-03-SUMMARY.md covering login, order management, product creation, logout |

**Score:** 7/8 truths verified (6 fully, 1 partial = gap, 2 human-verified = passed per smoke test)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/api/webhooks/paystack/route.ts` | Paystack webhook handler using SUPABASE_SERVICE_ROLE_KEY | VERIFIED | Line 86: `process.env.SUPABASE_SERVICE_ROLE_KEY!` confirmed |
| `src/app/orders/[reference]/page.tsx` | Order confirmation server component using SUPABASE_SERVICE_ROLE_KEY | VERIFIED | Line 13: `process.env.SUPABASE_SERVICE_ROLE_KEY!` confirmed |
| `src/app/shipping/page.tsx` | Shipping public page using BUSINESS.whatsapp | VERIFIED | Line 3: `import { BUSINESS }` present; line 57: `BUSINESS.whatsapp.url(raw.shipping_intl_message)` |
| `src/components/about/AboutSection.tsx` | About section using BUSINESS.whatsapp | VERIFIED | Line 3: `import { BUSINESS }` present; line 40: `href={BUSINESS.whatsapp.url()}` |
| `src/app/sitemap.ts` | Dynamic sitemap with all public routes | VERIFIED (code) | All public routes present; audit comment added; WIRED to Supabase for dynamic product/blog routes |
| `https://twinkle-mocha.vercel.app` | Live staging URL | VERIFIED | HTTP 200 — site live and accessible |
| Vercel env config | All 7 env vars set correctly | PARTIAL | All 7 vars confirmed set per 10-02-SUMMARY.md; NEXT_PUBLIC_SITE_URL has trailing slash causing sitemap URL bug |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/api/webhooks/paystack/route.ts` | SUPABASE_SERVICE_ROLE_KEY env var | `process.env.SUPABASE_SERVICE_ROLE_KEY` | WIRED | Confirmed at line 86 |
| `src/app/shipping/page.tsx` | BUSINESS.whatsapp.url() | import from @/lib/config/business | WIRED | Import at line 3; usage at line 57 |
| Vercel Production environment | GitHub main branch | Vercel GitHub integration | WIRED | Confirmed by commit c95b02c triggering deployment |
| NEXT_PUBLIC_SITE_URL | sitemap.ts + robots.ts | build-time baking | PARTIAL | Env var set but has trailing slash — causes sitemap double-slash bug |
| Paystack test payment | Supabase orders table | POST /api/webhooks/paystack | HUMAN-VERIFIED | Smoke test confirmed webhook delivery and order row creation |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `src/app/shipping/page.tsx` | `raw` (shipping rates) | Supabase `settings` table via `createClient().from('settings').select(...)` | Yes — DB query with fallback defaults | FLOWING |
| `src/app/sitemap.ts` | `products`, `posts` | Supabase `products` + `blog_posts` tables | Yes — live data confirmed (6 products in sitemap XML) | FLOWING |
| `src/components/about/AboutSection.tsx` | `section` prop | Passed from parent about page (server component) | Yes — prop is not hardcoded empty at call site | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Staging homepage responds 200 | `curl -o /dev/null -w "%{http_code}" https://twinkle-mocha.vercel.app/` | 200 | PASS |
| /admin redirects to login (not public) | `curl -o /dev/null -w "%{http_code}" https://twinkle-mocha.vercel.app/admin` | 307 | PASS |
| Sitemap XML is accessible | `curl https://twinkle-mocha.vercel.app/sitemap.xml` | 200 with XML content | PASS |
| Sitemap URLs use staging domain | Check sitemap.xml loc elements | staging domain present | PASS |
| Sitemap URLs are well-formed (no double-slash) | Check sitemap.xml URL format | FAIL — `//catalog`, `//about`, `//faq`, `//shipping`, `//blog` (double-slash) | FAIL |
| Double-slash URLs redirect correctly | `curl -o /dev/null -w "%{http_code}" https://twinkle-mocha.vercel.app//catalog` | 308 redirect to /catalog | INFO (functional but malformed) |
| SUPABASE_SERVICE_ROLE_SECRET absent | `grep -r "SUPABASE_SERVICE_ROLE_SECRET" src/` | No matches | PASS |
| Hardcoded 2348000000000 absent | `grep -r "2348000000000" src/` | No matches | PASS |
| NEXT_PUBLIC_PAYSTACK_SECRET_KEY absent | `grep -r "NEXT_PUBLIC_PAYSTACK_SECRET_KEY" src/` | No matches | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SEO-05 | 10-02-PLAN, 10-03-PLAN | Site is deployed to Vercel with a staging URL before DNS cutover to twinklelocs.com | PARTIALLY SATISFIED | Site is deployed and accessible at https://twinkle-mocha.vercel.app. Full smoke tests passed per developer self-report. Sitemap URL bug means the site is not fully correct for DNS cutover without a fix to NEXT_PUBLIC_SITE_URL env var. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| Vercel env config | N/A | `NEXT_PUBLIC_SITE_URL` has trailing slash | Warning | Causes malformed sitemap URLs (double-slash on all sub-routes) — would persist to production if not fixed before DNS cutover |

No anti-patterns found in source files. All five modified source files are clean.

### Human Verification Required

#### 1. Full Purchase Flow (self-reported PASS — re-verify if any doubts)

**Test:** In an incognito browser: browse to /catalog, add a bead product with size and thread colour selected, proceed to checkout, fill in customer details with Lagos as state, pay with Paystack test card (4084 0840 8408 4081, CVV 408, any future expiry), confirm redirect to /orders/[reference], then check Supabase orders table for status='paid' row.
**Expected:** Order confirmation page renders with reference and items; Supabase orders table has new row with status='paid'; Paystack test mode shows webhook delivery success.
**Why human:** Requires browser interaction, Paystack sandbox payment, and live Supabase write. Developer self-reported PASS in 10-03-SUMMARY.md after running full smoke test.

#### 2. Admin Flow (self-reported PASS — re-verify if any doubts)

**Test:** Navigate to https://twinkle-mocha.vercel.app/admin in incognito. Log in with admin credentials. Confirm dashboard shows recent orders including test order from purchase flow. Navigate to /admin/orders, open the test order, update its status. Navigate to /admin/products, create a test product, then check /catalog on the storefront to confirm it appears. Log out and confirm /admin redirects to login.
**Expected:** All admin operations work without errors; product created in admin appears on storefront; logout enforces auth guard.
**Why human:** Requires interactive browser session with admin credentials and live Supabase operations.

#### 3. No Console Errors / Broken Images (self-reported PASS — re-verify if any doubts)

**Test:** Open https://twinkle-mocha.vercel.app/ in Chrome with DevTools open (Console tab). Browse /, /catalog, and click a product detail page. Check for red errors in console and broken image icons on each page.
**Expected:** Zero console errors; all product images render; navigation links are functional.
**Why human:** Requires a real browser session to inspect DevTools console output.

### Gaps Summary

**1 gap found:**

The sitemap.xml at https://twinkle-mocha.vercel.app/sitemap.xml contains malformed URLs for all sub-routes due to a double-slash:

```
https://twinkle-mocha.vercel.app//catalog  (should be: /catalog)
https://twinkle-mocha.vercel.app//about    (should be: /about)
https://twinkle-mocha.vercel.app//faq      (should be: /faq)
https://twinkle-mocha.vercel.app//shipping (should be: /shipping)
https://twinkle-mocha.vercel.app//blog     (should be: /blog)
```

Root cause: `NEXT_PUBLIC_SITE_URL` is set to `https://twinkle-mocha.vercel.app/` (with trailing slash) in the Vercel environment. The sitemap.ts code constructs URLs as `${BASE}/catalog` — when BASE ends with `/`, this produces `//catalog`. The homepage URL (`BASE` alone) is correct.

Fix options:
1. (Recommended) Remove the trailing slash from `NEXT_PUBLIC_SITE_URL` in Vercel environment settings, then trigger a redeploy.
2. (Defensive) Add `.replace(/\/$/, '')` normalization to BASE in sitemap.ts to prevent recurrence — e.g., `const BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://twinklelocs.com').replace(/\/$/, '')`.

This must be fixed before DNS cutover, as the production value `https://twinklelocs.com` must also not have a trailing slash.

The human-verified smoke tests (SC2–SC4) were self-reported by the developer after completing the full smoke test suite in 10-03. They cannot be independently verified programmatically but the structured test plan and self-check: PASSED in the SUMMARY.md support their validity.

---

_Verified: 2026-04-24T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
