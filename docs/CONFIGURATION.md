<!-- generated-by: gsd-doc-writer -->
# Configuration

This document describes all environment variables and configuration files used by Twinkle Locs.

---

## Environment Variables

All environment variables are loaded from `.env.local` at the project root. Copy `.env.local.example` to get started:

```bash
cp .env.local.example .env.local
```

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Required** | — | Supabase project URL. Found in Supabase Dashboard → Project Settings → API. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | **Required** | — | Supabase anonymous/public key. Found in Supabase Dashboard → Project Settings → API. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Required** | — | Supabase service-role key used by server-only admin clients. Never expose this to the browser. Found in Supabase Dashboard → Project Settings → API → `service_role` key. |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | **Required** | — | Paystack public key used by the client-side checkout popup. Found in your Paystack Dashboard → Settings → API Keys. |
| `PAYSTACK_SECRET_KEY` | **Required** | — | Paystack secret key used to verify webhook HMAC-SHA512 signatures on the server. Found in your Paystack Dashboard → Settings → API Keys. |
| `NEXT_PUBLIC_SITE_URL` | Optional | `https://twinklelocs.com` | Canonical base URL used for Open Graph metadata, sitemaps, and robots.txt. Override in non-production environments. |

### Startup failure behaviour

The following variables cause the application to throw immediately if absent:

- **`SUPABASE_SERVICE_ROLE_KEY`** — `createAdminClient()` in `src/lib/supabase/admin.ts` throws `Error: SUPABASE_SERVICE_ROLE_KEY is not set` before any database query can proceed.
- **`NEXT_PUBLIC_SUPABASE_URL`**, **`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`**, **`NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`**, **`PAYSTACK_SECRET_KEY`** — these are accessed with the non-null assertion operator (`!`) throughout the codebase, so a missing value will cause a runtime error on first use rather than at startup.

---

## Config File Format

### `.env.local.example`

The canonical template for all required environment variables. Located at the project root. Contents:

```bash
# Supabase — get these from your Supabase project dashboard under Project Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-anon-key

# WhatsApp — international format without + or spaces (Nigeria: 234XXXXXXXXXX)
NEXT_PUBLIC_WHATSAPP_NUMBER=2348012345678
```

> Note: `NEXT_PUBLIC_WHATSAPP_NUMBER` in the example file is superseded by the hardcoded value in `src/lib/config/business.ts`. That file is the single source of truth for the WhatsApp number and other business details.

### `src/lib/config/business.ts`

A TypeScript constant file that centralises business details that do not belong in environment variables. It is the single place to update:

- WhatsApp number and deep-link helper
- Instagram handle and URL
- Support email address

Edit this file directly — do not duplicate these values elsewhere in the codebase.

### `next.config.ts`

Next.js configuration at the project root. Current settings:

| Option | Value | Purpose |
|---|---|---|
| `devIndicators` | `false` | Disables the Next.js dev toolbar overlay |
| `images.dangerouslyAllowSVG` | `true` | Allows SVG files to be served through the Next.js image optimiser |
| `images.contentSecurityPolicy` | `"default-src 'self'; script-src 'none'; sandbox;"` | CSP applied to SVGs served via the image optimiser |
| `images.remotePatterns` | `https://*.supabase.co` | Only images hosted on Supabase are allowed through the image optimiser |

---

## Required vs Optional Settings

| Variable | Status | Reason |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Required | Used by all Supabase client factories; missing value causes a runtime error |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Required | Used by browser and server Supabase clients |
| `SUPABASE_SERVICE_ROLE_KEY` | Required | Explicitly validated with an early `throw` in `createAdminClient()` |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Required | Used by `PaystackButton` to initialise the payment popup |
| `PAYSTACK_SECRET_KEY` | Required | Used in the Paystack webhook route to verify HMAC-SHA512 signatures |
| `NEXT_PUBLIC_SITE_URL` | Optional | Falls back to `'https://twinklelocs.com'` wherever it is referenced |

---

## Defaults

| Variable | Default value | Where set |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `'https://twinklelocs.com'` | `src/app/layout.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`, and individual page files via `?? 'https://twinklelocs.com'` |

---

## Per-Environment Overrides

The project uses a single `.env.local` file. No `.env.development`, `.env.production`, or `.env.test` files are present in the repository.

To switch between Paystack test and live keys (the most common environment-specific concern), set the following variables to the appropriate values for your environment:

- `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` — use your Paystack **test** public key locally and your **live** public key in production.
- `PAYSTACK_SECRET_KEY` — use your Paystack **test** secret key locally and your **live** secret key in production.

For the Paystack webhook to be reachable during local development, use a tunnelling tool such as `ngrok` or the Paystack CLI and point the webhook URL to your local server. <!-- VERIFY: Paystack webhook configuration URL in the Paystack Dashboard -->
