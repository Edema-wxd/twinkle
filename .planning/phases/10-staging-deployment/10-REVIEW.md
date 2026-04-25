---
phase: 10-staging-deployment
reviewed: 2026-04-24T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/app/api/webhooks/paystack/route.ts
  - src/app/orders/[reference]/page.tsx
  - src/app/shipping/page.tsx
  - src/components/about/AboutSection.tsx
  - src/app/sitemap.ts
  - src/app/robots.ts
findings:
  critical: 2
  warning: 5
  info: 2
  total: 9
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-04-24T00:00:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Six files were reviewed covering the Paystack webhook handler, order confirmation page (including the client-side `OrderPoller`), shipping page, About section component, sitemap, and robots config. Shipping, robots, and sitemap are clean except for one informational item each. The critical concerns are: unsanitized CMS HTML rendered with `dangerouslySetInnerHTML` (stored XSS), and the idempotency guard silently bypassed when the DB query errors. Warnings cover additional robustness gaps in the webhook handler and a probable RLS issue in the client-side order poller. All critical and warning items have concrete fix suggestions below.

---

## Critical Issues

### CR-01: Stored XSS — `dangerouslySetInnerHTML` on unsanitized database content

**File:** `src/components/about/AboutSection.tsx:34`

**Issue:** `section.body` is fetched from the Supabase `about_sections` table and injected directly as raw HTML with no sanitization. If an attacker gains write access to the admin panel or database, arbitrary JavaScript can be stored and executed in every visitor's browser — enabling session theft, credential harvesting, or payment-form skimming.

**Fix:** Sanitize the string server-side before rendering. Because `AboutSection` is used inside a Server Component tree, `sanitize-html` is the simplest choice (no DOM shim needed):

```bash
npm i sanitize-html @types/sanitize-html
```

```tsx
import sanitizeHtml from 'sanitize-html'

// In AboutSection (or in the parent Server Component before passing the prop):
const safeBody = section.body
  ? sanitizeHtml(section.body, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h2', 'img']),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        a: ['href', 'target', 'rel'],
      },
    })
  : null

// Then render:
{safeBody && (
  <div
    className="[&_h2]:font-heading ..."
    dangerouslySetInnerHTML={{ __html: safeBody }}
  />
)}
```

Alternatively, if the body is always Markdown, replace `dangerouslySetInnerHTML` with `react-markdown`, which never injects raw HTML by default.

---

### CR-02: Idempotency guard silently bypassed on DB query error — allows duplicate orders

**File:** `src/app/api/webhooks/paystack/route.ts:97–106`

**Issue:** The idempotency check only inspects `existing.data`:

```typescript
if (existing.data) {
  return
}
```

If the Supabase query fails (network timeout, RLS misconfiguration), `existing.error` is set and `existing.data` is `null`. The check evaluates to `false` and the handler continues, inserting a duplicate order on every Paystack retry. Depending on whether there is a unique constraint on `paystack_reference`, this either silently produces duplicate paid orders or swallows a unique-violation error.

**Fix:** Check the error first and return early to fail-safe:

```typescript
const existing = await supabase
  .from('orders')
  .select('id')
  .eq('paystack_reference', data.reference)
  .maybeSingle()

if (existing.error) {
  console.error('[webhook] Idempotency check failed:', existing.error)
  // Fail safe: abort — Paystack will retry and the DB should be healthy by then.
  return
}

if (existing.data) {
  return // already processed
}
```

---

## Warnings

### WR-01: `JSON.parse(body)` is not wrapped in try/catch — unhandled SyntaxError returns 500

**File:** `src/app/api/webhooks/paystack/route.ts:70`

**Issue:** `JSON.parse(body)` is called after the HMAC check with no error handling. A body that passes HMAC verification but contains malformed JSON (theoretically possible if Paystack ever sends a truncated payload) throws a `SyntaxError` that propagates as an unhandled exception. Paystack receives a 500 and retries indefinitely.

**Fix:**

```typescript
let event: PaystackEvent
try {
  event = JSON.parse(body)
} catch {
  console.error('[webhook] Malformed JSON body for signature', signature)
  return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
}
```

---

### WR-02: Metadata destructuring can throw on malformed or missing fields — no try/catch at call site

**File:** `src/app/api/webhooks/paystack/route.ts:75, 108`

**Issue:** `handleChargeSuccess` destructures `data.metadata` at line 108. If `metadata` is absent or malformed (an edge case in Paystack's test mode or future payload changes), this throws a `TypeError`. The `await handleChargeSuccess(event.data)` at line 75 has no try/catch, so the exception crashes the handler and Paystack sees a 500 and retries.

**Fix:** Guard the metadata fields and wrap the call site:

```typescript
// Guard inside handleChargeSuccess, line ~108:
const { customer_details, cart_items, subtotal, shipping_cost } = data.metadata ?? {}
if (!customer_details || !Array.isArray(cart_items) || cart_items.length === 0) {
  console.error('[webhook] Missing metadata fields for reference:', data.reference)
  return
}

// Wrap the call site (line 74-76) in try/catch:
try {
  if (event.event === 'charge.success') {
    await handleChargeSuccess(event.data)
  }
} catch (err) {
  console.error('[webhook] Unhandled error in handleChargeSuccess:', err)
  // Return 200 to prevent infinite Paystack retries for a payload we cannot parse.
  return NextResponse.json({ received: true, warning: 'processing_error' }, { status: 200 })
}
```

---

### WR-03: `order_items` insert failure returns 200 — Paystack will not retry; order is left with no items

**File:** `src/app/api/webhooks/paystack/route.ts:152–156`

**Issue:** If the `order_items` insert fails (lines 152-156), the error is logged and the handler returns `{ received: true }` with status 200. Paystack treats this as success and never retries. The result is a paid order in the database with zero line items — it appears in the admin panel but cannot be fulfilled. The idempotency guard ensures a retry would not create a duplicate order header, so returning 500 on items-insert failure is safe and correct.

**Fix:** Return a 500 on items insert failure so Paystack retries:

```typescript
const itemsResult = await supabase.from('order_items').insert(orderItems)

if (itemsResult.error) {
  console.error('[webhook] Failed to insert order_items:', itemsResult.error)
  // Signal failure — Paystack will retry; the order header idempotency guard
  // prevents duplicates on retry.
  throw new Error('order_items insert failed')
}
```

Then in `POST`, let the `catch` block added in WR-02 return a 500 to trigger the retry.

---

### WR-04: `OrderPoller` uses the anon Supabase client — will silently fail if RLS blocks anon reads on `orders`

**File:** `src/app/orders/[reference]/OrderPoller.tsx:21–38`

**Issue:** `OrderPoller` (the client-side fallback) calls `createClient()` from `@/lib/supabase/client`, which uses the anon key. If `orders` has RLS enabled without an anon `SELECT` policy — as is standard for a table containing customer PII — all queries will return an empty result. The poller loops until the 30-second timeout, then shows "Still Processing" even when the order exists and is fully inserted. The server component at `page.tsx:23-27` uses the service-role client correctly, but the client-side path does not.

The Realtime subscription at line 44-60 has the same issue: channel events for `orders` may be blocked for anon subscribers if Realtime RLS is enabled.

**Fix:** Replace the direct Supabase query in `OrderPoller` with a call to a thin API route that uses the service-role key server-side:

```typescript
// src/app/api/orders/[reference]/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: { reference: string } }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('paystack_reference', params.reference)
    .maybeSingle()
  if (error || !data) return Response.json(null, { status: 404 })
  return Response.json(data)
}
```

Then in `OrderPoller`, replace `supabase.from('orders')...` with `fetch(`/api/orders/${reference}`)`.

---

### WR-05: Abandoned-order recovery matches only on email — marks unrelated past carts as recovered

**File:** `src/app/api/webhooks/paystack/route.ts:159–163`

**Issue:** The recovery update filters by `customer_email = X AND recovered = false`. A returning customer with multiple abandoned carts for different products will have all their unrecovered abandoned-order records marked recovered when any payment is completed. This corrupts analytics (recovery rate is inflated) and may suppress follow-up marketing for genuinely unrecovered carts.

**Fix:** If `abandoned_orders` stores a `paystack_reference` or cart session identifier, match on that instead. At minimum, add a time window to limit the blast radius:

```typescript
// Option A — match by reference (preferred, if column exists):
.eq('paystack_reference', data.reference)

// Option B — time-bounded fallback:
.eq('customer_email', data.customer.email.toLowerCase())
.eq('recovered', false)
.gte('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
```

---

## Info

### IN-01: `PAYSTACK_SECRET_KEY` non-null assertion gives no diagnostic on missing env var

**File:** `src/app/api/webhooks/paystack/route.ts:61`

**Issue:** `process.env.PAYSTACK_SECRET_KEY!` suppresses the TypeScript undefined warning. If the variable is absent in a staging deployment, `crypto.createHmac` receives `undefined` cast to a string, which throws a `TypeError` with no indication that a missing env var is the root cause.

**Fix:** Add an explicit guard at the top of the handler:

```typescript
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY
if (!PAYSTACK_SECRET) {
  console.error('[webhook] PAYSTACK_SECRET_KEY is not configured')
  return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
}
// Use PAYSTACK_SECRET (typed string) in createHmac below
```

---

### IN-02: `sitemap.ts` uses `created_at` for product `lastModified` — crawlers cannot detect product updates

**File:** `src/app/sitemap.ts:31–35`

**Issue:** Product sitemap entries use `p.created_at` as `lastModified`. When a product's description, images, or variants are updated after creation, the sitemap timestamp does not change and search engine crawlers have no signal to re-crawl the page. Blog posts correctly use `updated_at` (line 39).

**Fix:** Select `updated_at` from the products query and prefer it:

```typescript
supabase
  .from('products')
  .select('slug, created_at, updated_at')
  .eq('is_active', true),

// in productRoutes map:
lastModified: p.updated_at ?? p.created_at,
```

If `products` does not have an `updated_at` column, add one with a Postgres `moddatetime` trigger or application-level update on write.

---

_Reviewed: 2026-04-24T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
