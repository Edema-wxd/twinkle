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


## Email (Resend)

Every email goes through `src/lib/email/client.ts`. That includes order confirmations and status updates, the new-order alert, review reminders, admin compose, test sends and re-sends.

| Variable | Required | What it does |
|---|---|---|
| `RESEND_API_KEY` | Yes | Resend API key. A full-access key lets the admin's **Email setup** panel check the domain. A send-only key works but can't check it. |
| `RESEND_FROM` | Yes | Sender, e.g. `Twinkle Locs <orders@twinklelocs.com>`. Its domain must be **verified in Resend**, or every send is rejected. |
| `EMAIL_REPLY_TO` | No | Where customer replies go. Defaults to `hello@twinklelocs.com`. The new-order alert replies to the customer instead. |
| `RESEND_WEBHOOK_SECRET` | No (recommended) | Turns on delivery tracking. In Resend → Webhooks, add `https://<site>/api/webhooks/resend` (all `email.*` events) and paste its signing secret. The Emails log then shows Delivered, Opened, Bounced and Marked as spam. |
| `NEWSLETTER_SECRET` | No | Signs the personal unsubscribe links in newsletter emails, and the confirmation links new subscribers get. Falls back to `BETTER_AUTH_SECRET`, so it's only needed if you want to rotate one without the other. Changing it makes links in emails already sent stop working (people can still unsubscribe by message). Newsletters must be sent with `sendNewsletterEmail()` (`src/lib/newsletter/send.ts`), which adds the unsubscribe link and the one-click headers Gmail and Yahoo require. |

What the client guarantees:
- **Logging:** each send is logged in `email_logs` (awaited) with Resend's message id.
- **No duplicates:** automatic sends carry an idempotency key, so a Paystack webhook retry never emails anyone twice. The admin's **Resend** button deliberately skips the key.
- **Retries:** brief Resend errors (429/5xx) are retried twice.
- **Tags:** emails are tagged `category` and `template` in Resend for filtering.
- **Reliable status emails:** emails triggered by admin status changes run in `after()`, so Vercel doesn't freeze them mid-send.

Admin → **Emails** shows the setup check, a **Send test email** button, delivery status per email, and a **Needs attention** filter for failures, bounces and spam complaints. The new-order alert goes to the `email` setting in Admin → Settings, or the support address if that's empty.

## Ad tracking (Meta Pixel, TikTok Pixel)

Everything here is optional and **off when unset**: with no pixel ID there is no cookie banner, no pixel script and nothing is sent to Meta or TikTok. Each platform is independent, so you can turn on Meta only, TikTok only, or both.

| Variable | Where to find it | What it does |
|---|---|---|
| `NEXT_PUBLIC_META_PIXEL_ID` | Meta Events Manager → Data sources → your dataset (pixel) → Settings → **Dataset ID** (digits only) | Turns on the Meta Pixel and the cookie banner. |
| `META_CAPI_ACCESS_TOKEN` | Same Settings page → **Conversions API** → **Generate access token** | Server-side `Purchase` through the Conversions API. Needs the pixel ID too. Server only, never exposed to the browser. |
| `META_TEST_EVENT_CODE` | Events Manager → your dataset → **Test events** tab (e.g. `TEST12345`) | Optional. Server events show up under Test events. Remove it once you've checked, or live purchases keep landing there. |
| `NEXT_PUBLIC_TIKTOK_PIXEL_ID` | TikTok Ads Manager → Tools → **Events** → Web events → your pixel → **Pixel ID** (e.g. `C4ABC...`) | Turns on the TikTok Pixel and the cookie banner. |
| `TIKTOK_EVENTS_ACCESS_TOKEN` | Same pixel → **Settings** → **Events API** → **Generate access token** | Server-side `CompletePayment` through the Events API 2.0. Needs the pixel ID too. Server only. |
| `TIKTOK_TEST_EVENT_CODE` | Your pixel → **Test events** tab | Optional, as for Meta. Remove it once you've checked. |

`NEXT_PUBLIC_*` values are built into the browser code, so redeploy after changing them.

How it behaves:
- **Consent first.** The pixels load only after the visitor presses **Accept** on the cookie banner (Nigeria Data Protection Act). The choice is kept in the `tl_consent` cookie for 180 days, and can be changed on `/privacy`. Declining clears the pixels' cookies.
- **Events.** PageView on every page, plus ViewContent, SelectVariant, AddToCart, InitiateCheckout, Purchase (TikTok: CompletePayment), Lead (TikTok: SubmitForm) and Contact, all from `trackEvent()` in `src/lib/tracking/events.ts`. Values are in NGN; content ids are product ids.
- **Server-side Purchase.** When a paid order is first recorded (by the Paystack webhook or the verify call, whichever comes first), `src/lib/tracking/server.ts` sends it to Meta and TikTok after the response, once, and only if the buyer accepted at checkout. Email and phone are SHA-256 hashed. The browser Purchase on the order page uses the same event id (the Paystack reference), so each sale counts once. Failures are logged as `[tracking]` and never affect the order.
- **Ad links (UTM).** `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` and `utm_term` from the landing URL are kept in the first-party `tl_utm` cookie for 30 days (last click wins), sent with the Paystack metadata at checkout, and shown under **Ad source** on the admin order page. This works without pixels or consent.
- **CSP.** `next.config.ts` allows `connect.facebook.net`, `www.facebook.com`, `analytics.tiktok.com` and `analytics-ipv6.tiktokw.us` for the pixels.

To test: set the pixel IDs and test event codes, accept the banner, place a Paystack test order, and check the Test events tabs. The browser and server Purchase should appear as one deduplicated event.
