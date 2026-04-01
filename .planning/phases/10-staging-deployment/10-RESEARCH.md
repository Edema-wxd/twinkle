# Phase 10: Staging Deployment - Research

**Researched:** 2026-04-01
**Domain:** Vercel deployment, Supabase production setup, Paystack test/live mode, environment variable management
**Confidence:** HIGH

---

## Summary

Phase 10 deploys the Twinkle Locs Next.js 15 / Supabase / Paystack app to a public Vercel staging URL
and verifies it end-to-end before DNS cutover to twinklelocs.com.

The primary concerns are: (1) getting every environment variable correctly set in Vercel's dashboard,
(2) deciding whether staging uses the same or a separate Supabase project, (3) configuring Paystack
test-mode keys and a public webhook URL, and (4) running structured smoke tests against the deployed
URL.

The standard approach for a pre-launch staging run of a solo project is to use the **same Supabase
project** that was used during development (data already exists), deploy to Vercel's default Preview
environment, set Paystack to test mode with test-mode keys, and register the deployed webhook URL
in the Paystack test dashboard. Separate Supabase projects are recommended for mature CI/CD pipelines
with migration management — overkill for a first staging deployment.

**Primary recommendation:** Deploy `main` branch to Vercel Production environment but without the
production domain attached. Use that permanent `*.vercel.app` URL as the staging URL, then attach
`twinklelocs.com` only after smoke tests pass.

---

## Standard Stack

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Vercel CLI | latest | Deploy, pull env vars locally | Native Next.js platform |
| Vercel Dashboard | — | Env var management, deployment logs | No config files needed |
| Paystack Dashboard | — | Switch test/live keys, register webhook URL | Per-mode configuration |
| Supabase Dashboard | — | Manage allowed redirect URLs, RLS policies | Centralised auth config |

### Supporting
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| `vercel env pull` CLI command | latest | Pull remote env vars into `.env.local` | Syncing local dev vars from Vercel |
| `next build && next start` | — | Local production-mode smoke test before deploy | Catching build errors pre-push |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Same Supabase project for staging | Separate Supabase staging project | Separate project is safer for migrations but requires schema sync; unnecessary for pre-launch |
| Vercel Production env (no custom domain) | Vercel Preview env (branch deploy) | Production env gives a stable permanent URL suitable for smoke testing |

**Installation (Vercel CLI):**
```bash
npm i -g vercel
vercel link        # link repo to Vercel project
vercel env pull    # pull env vars into .env.local
```

---

## Architecture Patterns

### Recommended Deployment Approach for Staging

Use the Vercel **Production** environment without attaching `twinklelocs.com` as a domain yet.
This gives a stable, permanent `twinkle-locs.vercel.app` (or similar) URL that does not change
between pushes — unlike Preview URLs which are per-commit.

When smoke tests pass, attach the custom domain. Vercel automatically promotes the already-built
deployment; no re-build occurs.

```
git push origin main
  → Vercel builds Production environment
  → Site live at: https://twinkle-locs.vercel.app   ← staging URL
  → DNS NOT yet pointed at this deployment

Smoke tests pass
  → Attach twinklelocs.com in Vercel Dashboard > Domains
  → Zero-downtime DNS cutover
```

### Environment Variable Scoping on Vercel

Vercel has three built-in environments: **Production**, **Preview**, and **Development**.

| Variable | Production | Preview | Development |
|----------|-----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | real project URL | real project URL | real project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | real publishable key | real publishable key | real publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | real service role key | real service role key | real service role key |
| `SUPABASE_SERVICE_ROLE_SECRET` | real service role key | real service role key | real service role key |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | **`pk_live_...`** | **`pk_test_...`** | `pk_test_...` |
| `NEXT_PUBLIC_PAYSTACK_SECRET_KEY` | (**remove — wrong prefix**) | (**remove — wrong prefix**) | — |
| `PAYSTACK_SECRET_KEY` | `sk_live_...` | `sk_test_...` | `sk_test_...` |
| `NEXT_PUBLIC_SITE_URL` | `https://twinklelocs.com` | `https://twinkle-locs.vercel.app` | `http://localhost:3000` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | real number | real number | placeholder |

### Vercel System Variables (auto-injected, no setup needed)

Vercel automatically injects these at build and runtime — no need to add them manually:

| Variable | Value Example | Use |
|----------|--------------|-----|
| `VERCEL_URL` | `twinkle-locs.vercel.app` | Current deployment host (no protocol) |
| `VERCEL_ENV` | `production` / `preview` | Which environment is running |
| `VERCEL_PROJECT_PRODUCTION_URL` | `twinklelocs.com` | Always points to production domain |
| `VERCEL_BRANCH_URL` | `twinkle-git-main.vercel.app` | Branch-specific URL |

`VERCEL_URL` is server-side only. To use it client-side, enable "Automatically expose System
Environment Variables" in Vercel Project Settings, then access `process.env.NEXT_PUBLIC_VERCEL_URL`.

### Project Structure (relevant to deployment)

```
.env.local                  # never committed; local dev only
src/
├── app/
│   ├── api/
│   │   └── webhooks/
│   │       └── paystack/   # Must be reachable from Paystack (middleware matcher excludes it)
│   ├── sitemap.ts          # Uses NEXT_PUBLIC_SITE_URL — must be set correctly
│   └── robots.ts           # Uses NEXT_PUBLIC_SITE_URL — disallow /admin, /cart, etc.
├── lib/supabase/
│   ├── client.ts           # Uses NEXT_PUBLIC_SUPABASE_URL + PUBLISHABLE_KEY
│   ├── server.ts           # Uses NEXT_PUBLIC_SUPABASE_URL + PUBLISHABLE_KEY
│   └── admin.ts            # Uses SUPABASE_SERVICE_ROLE_KEY (no NEXT_PUBLIC_)
middleware.ts               # Uses NEXT_PUBLIC_SUPABASE_URL + PUBLISHABLE_KEY
```

### Anti-Patterns to Avoid

- **Deploying to Preview environment for staging:** Preview URLs change per commit (`twinkle-abc123.vercel.app`). Use Production environment for a stable staging URL.
- **Attaching the custom domain before smoke tests:** Attach `twinklelocs.com` only after the staging pass is confirmed.
- **Using live Paystack keys during staging:** Always use `pk_test_` and `sk_test_` keys until ready for real transactions.
- **Same webhook URL for test and live Paystack modes:** Paystack has separate webhook URL fields per mode in the dashboard.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Environment variable management | Custom config files | Vercel Dashboard env vars | Encrypted at rest, scoped per environment, no secrets in git |
| Staging URL | Separate subdomain or proxy | Vercel Production URL without domain attached | Zero-config, TLS included, same infra as production |
| Webhook testing | ngrok or local tunnels | Deploy to Vercel first; register deployed URL with Paystack | Paystack can't reach localhost; deployed URL is permanent |
| Build verification | Manual `npm run build` checks | `next build` locally before first Vercel deploy | Catches TypeScript and import errors before they burn a deployment |

**Key insight:** Vercel handles TLS, CDN, serverless function deployment, and environment isolation out of the box. There is no configuration file needed to deploy a Next.js app to Vercel.

---

## Common Pitfalls

### Pitfall 1: `NEXT_PUBLIC_PAYSTACK_SECRET_KEY` in .env.local — Secret Key Exposed to Browser

**What goes wrong:** The current `.env.local` has `NEXT_PUBLIC_PAYSTACK_SECRET_KEY=sk_live_...`. The `NEXT_PUBLIC_` prefix inlines the value into the client-side JavaScript bundle. Anyone can read the secret key from the browser's network tab or source.

**Why it happens:** Developers prefix everything with `NEXT_PUBLIC_` to avoid "undefined" errors. The secret key is only used server-side (webhook HMAC verification in `api/webhooks/paystack/route.ts` as `PAYSTACK_SECRET_KEY`), so it should never be `NEXT_PUBLIC_`.

**How to avoid:** In Vercel, add `PAYSTACK_SECRET_KEY` (no `NEXT_PUBLIC_` prefix) for server-side use. Do NOT add `NEXT_PUBLIC_PAYSTACK_SECRET_KEY`. Remove the `NEXT_PUBLIC_` version from `.env.local` entirely.

**Warning signs:** `process.env.NEXT_PUBLIC_PAYSTACK_SECRET_KEY` referenced in any server route file; key starting with `sk_live_` appearing in the browser's JavaScript bundle.

---

### Pitfall 2: Duplicate/Inconsistent Service Role Key Names

**What goes wrong:** The codebase uses two different env var names for the Supabase service role key:
- `SUPABASE_SERVICE_ROLE_KEY` — used in `src/lib/supabase/admin.ts`
- `SUPABASE_SERVICE_ROLE_SECRET` — used in `src/app/api/webhooks/paystack/route.ts` and `src/app/orders/[reference]/page.tsx`

Both must be set in Vercel's env vars, or one set of server routes will crash at runtime.

**How to avoid:** Add both `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_SERVICE_ROLE_SECRET` to Vercel with the same value (the Supabase service role JWT). Longer-term, unify to one name.

**Warning signs:** 500 errors on `/orders/[reference]` or webhook not writing to DB while admin panel works fine (or vice versa).

---

### Pitfall 3: `NEXT_PUBLIC_SITE_URL` Left as `http://localhost:3000`

**What goes wrong:** `sitemap.ts`, `robots.ts`, metadata across pages, and JSON-LD structured data all use `NEXT_PUBLIC_SITE_URL`. If left as `http://localhost:3000`, the sitemap will list localhost URLs and OG tags will have broken canonical URLs — hurting SEO from day one.

**How to avoid:** Set `NEXT_PUBLIC_SITE_URL=https://twinkle-locs.vercel.app` (the staging URL) in Vercel's Production environment variables before the first build. After DNS cutover, update to `https://twinklelocs.com`.

**Warning signs:** `curl https://twinkle-locs.vercel.app/sitemap.xml` returns URLs beginning with `http://localhost`.

---

### Pitfall 4: Paystack Webhook URL Not Registered for Test Mode

**What goes wrong:** After staging deployment, payment flows complete in the Paystack popup, but no order appears in the admin panel. The webhook event is firing to an unregistered or wrong URL.

**Why it happens:** Paystack's test mode and live mode each have their own webhook URL field. Test transactions only fire to the test webhook URL.

**How to avoid:** In Paystack Dashboard > Settings > API Keys & Webhooks, scroll to "Test Mode" section and set the webhook URL to:
`https://twinkle-locs.vercel.app/api/webhooks/paystack`

Verify the middleware `config.matcher` excludes `api/webhooks` — it does (already implemented: `api/webhooks` in the negative lookahead).

**Warning signs:** Paystack inline popup shows "Payment successful" but no order record in Supabase `orders` table.

---

### Pitfall 5: Supabase Redirect URLs Not Including Staging Domain

**What goes wrong:** Admin login redirects fail or auth cookies don't persist on the staging URL because Supabase's allowed redirect URLs don't include `twinkle-locs.vercel.app`.

**Why it happens:** Supabase Auth validates redirect URLs against an allowlist. Requests from unlisted domains are rejected.

**How to avoid:** In Supabase Dashboard > Authentication > URL Configuration:
- **Site URL:** `https://twinklelocs.com` (production, leave as-is)
- **Redirect URLs:** Add `https://twinkle-locs.vercel.app/**`

Wildcards with `**` are supported and match all paths.

**Warning signs:** Admin login page redirects to an error or returns to itself in a loop on the staging URL.

---

### Pitfall 6: Build-Time Environment Variables Not Set Before First Deploy

**What goes wrong:** Next.js inlines `NEXT_PUBLIC_*` variables at build time, not runtime. If a `NEXT_PUBLIC_` variable is not set when the Vercel build runs, it will be `undefined` in all pages — even after you add the variable later. A redeploy is required.

**How to avoid:** Set all environment variables in Vercel Dashboard **before** the first deploy (or before clicking "Redeploy"). The order is: set variables → push code (or trigger redeploy).

**Warning signs:** `NEXT_PUBLIC_SUPABASE_URL` is `undefined` in the browser console despite being set in Vercel's env var dashboard.

---

### Pitfall 7: `robots.ts` Disallows the Staging URL from Indexing (Non-Issue, but Confirm)

**What goes wrong:** Not a pitfall — the `robots.ts` correctly disallows `/admin/`, `/cart`, `/orders/`, `/api/`. However, if `NEXT_PUBLIC_SITE_URL` is wrong, the `sitemap:` reference in robots.txt will point to the wrong domain.

**How to avoid:** After deployment, fetch `https://twinkle-locs.vercel.app/robots.txt` and verify the `Sitemap:` URL matches the staging domain.

---

### Pitfall 8: Vercel Hobby Plan — Commercial Use Restriction

**What goes wrong:** Vercel's Hobby (free) plan is restricted to non-commercial personal use. An e-commerce store generating revenue technically requires the Pro plan.

**How to avoid:** Upgrade to Vercel Pro before going live with real transactions. Staging and smoke testing is fine on Hobby. The Pro plan also raises serverless function timeout from 10s to 60s — relevant if Supabase queries are slow.

---

## Code Examples

### Setting Environment Variables via Vercel CLI

```bash
# Source: https://vercel.com/docs/environment-variables
# Add a variable to Production only
vercel env add PAYSTACK_SECRET_KEY production

# Add a variable to Preview only
vercel env add PAYSTACK_SECRET_KEY preview

# Pull all env vars from Vercel Development environment to .env.local
vercel env pull .env.local
```

### Vercel Dashboard Environment Variable Setup (all required vars)

```
# PUBLIC (safe to expose to browser)
NEXT_PUBLIC_SUPABASE_URL          = https://aagychiqjngwutgmskab.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = sb_publishable_...
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY   = pk_test_...  (Preview/staging)
                                  = pk_live_...  (Production after cutover)
NEXT_PUBLIC_SITE_URL              = https://twinkle-locs.vercel.app  (staging)
                                  = https://twinklelocs.com           (production)
NEXT_PUBLIC_WHATSAPP_NUMBER       = 2348XXXXXXXXX  (real number)

# SERVER-SIDE ONLY (never NEXT_PUBLIC_)
SUPABASE_SERVICE_ROLE_KEY         = eyJhbGci...  (Supabase service role JWT)
SUPABASE_SERVICE_ROLE_SECRET      = eyJhbGci...  (same value — codebase uses both names)
PAYSTACK_SECRET_KEY               = sk_test_...  (Preview/staging)
                                  = sk_live_...  (Production after cutover)
```

### Checking Build Output Locally Before Deploy

```bash
# Source: https://nextjs.org/docs/app/guides/production-checklist
cd /path/to/twinkle

# Set production-like vars in .env.production.local (not committed)
# Then build and start
npm run build
npm run start
# Visit http://localhost:3000 and smoke test manually
```

### Registering Paystack Test Webhook URL

After first Vercel deployment succeeds:
1. Go to: `https://dashboard.paystack.com/#/settings/developer`
2. Scroll to "Test Mode" API Keys section
3. Set **Webhook URL (Test Mode):** `https://twinkle-locs.vercel.app/api/webhooks/paystack`
4. Save
5. Test by completing a payment with Paystack test card

### Paystack Test Card Numbers (for smoke testing)

```
Visa (no authentication):
  Card:  4084 0840 8408 4081
  CVV:   408
  Expiry: any future date

Verve (PIN + OTP required):
  Card:  5060 6666 6666 6666 666
  CVV:   123
  PIN:   1234
  OTP:   123456

Verve (alternative):
  Card:  5078 5078 5078 5078 04
  CVV:   884
  PIN:   0000
```

Source: https://paystack.com/docs/payments/test-payments/ (verified via WebSearch cross-reference)

### Confirming Webhook Delivery

```bash
# After a test payment, check order was created:
# In Supabase Dashboard > Table Editor > orders
# Filter by created_at desc — should see new row with status='paid'

# Or via Paystack Dashboard > Transactions > (test transaction)
# Shows webhook delivery status and HTTP response code
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase 2024-2025 transition | Same permissions; new format easier to rotate. Both work during transition period. |
| `getSession()` for auth | `getClaims()` + `getUser()` for admin | 2024 (CVE-2025-29927) | Project already uses correct pattern. No change needed. |
| Single Vercel environment | Production + Preview + Custom Environments | Always available | Custom environments (Pro plan) enable true staging isolation if needed later. |

**Deprecated/outdated:**
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Works but will be phased out. Project already uses new `PUBLISHABLE_KEY` format — correct.
- `export const runtime = "experimental-edge"`: Replaced by `export const runtime = "edge"`. Not used in this project.

---

## Open Questions

1. **Vercel plan tier for launch**
   - What we know: Hobby plan restricts commercial use; Pro plan costs $20/month and raises function timeout to 60s.
   - What's unclear: Will the Hobby plan's 10s function timeout cause issues for Supabase queries or Paystack webhook processing? The webhook handler does two sequential DB writes — should complete well under 10s.
   - Recommendation: Start staging on Hobby; upgrade to Pro before accepting real payments.

2. **`SUPABASE_SERVICE_ROLE_SECRET` vs `SUPABASE_SERVICE_ROLE_KEY` — code uses both names**
   - What we know: Two source files use `SUPABASE_SERVICE_ROLE_SECRET`; one uses `SUPABASE_SERVICE_ROLE_KEY`.
   - What's unclear: Whether this was intentional (it was not — it's a leftover inconsistency).
   - Recommendation: The planning phase should include a task to consolidate to `SUPABASE_SERVICE_ROLE_KEY` (the name used in `admin.ts`) across all files. For now, both env vars must be set in Vercel with the same value.

3. **Paystack live mode activation status**
   - What we know: `.env.local` has `pk_live_` and `sk_live_` keys, suggesting the Paystack account is approved for live mode.
   - What's unclear: Whether the live Paystack webhook URL for production has been registered yet.
   - Recommendation: For staging, use test keys. Register the live webhook URL only when attaching `twinklelocs.com`.

---

## Sources

### Primary (HIGH confidence)
- Vercel Environments docs — `https://vercel.com/docs/deployments/environments` — Preview vs Production, Custom Environments
- Vercel Environment Variables docs — `https://vercel.com/docs/environment-variables` — scoping, 64KB limit, build-time baking
- Vercel System Environment Variables — `https://vercel.com/docs/environment-variables/system-environment-variables` — VERCEL_URL, VERCEL_ENV full reference
- Next.js Production Checklist — `https://nextjs.org/docs/app/guides/production-checklist` — checked March 31 2026
- Supabase Managing Environments — `https://supabase.com/docs/guides/deployment/managing-environments` — separate project guidance
- Supabase Redirect URLs — `https://supabase.com/docs/guides/auth/redirect-urls` — wildcard support for Vercel preview URLs
- Supabase API Keys — `https://supabase.com/docs/guides/api/api-keys` — publishable key vs anon key

### Secondary (MEDIUM confidence)
- Paystack Test/Live Mode — `https://support.paystack.com/en/articles/2129922` — mode switching, separate webhook fields
- Paystack test card numbers — `https://paystack.com/docs/payments/test-payments/` (403 on direct fetch; cross-referenced via WebSearch with docs-v1.paystack.com/docs/test-cards)
- Vercel Common Next.js App Router Mistakes — `https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them` — absolute URL requirement for route handlers, revalidation

### Tertiary (LOW confidence — from WebSearch, not directly verified)
- Vercel Hobby plan 10s function timeout, 12 serverless functions per deployment limit — cross-referenced with `https://vercel.com/docs/functions/limitations`

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against Vercel, Supabase, Paystack official docs
- Architecture (deployment approach): HIGH — directly from Vercel environments docs
- Environment variables: HIGH — verified for naming and scoping; service role key naming inconsistency found directly in codebase
- Security issue (NEXT_PUBLIC_ secret key): HIGH — confirmed `NEXT_PUBLIC_PAYSTACK_SECRET_KEY` in `.env.local`, `PAYSTACK_SECRET_KEY` (no prefix) used in webhook route
- Paystack test cards: MEDIUM — official docs URL found but returned 403; values cross-referenced from multiple community sources
- Pitfalls: HIGH — derived from direct codebase inspection + official docs

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (Supabase key transition period could change; Vercel plan pricing could change)
