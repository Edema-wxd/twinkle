---
phase: 11
plan: 01
task: 3
title: Migrate all database WRITE paths to Drizzle
completed: 2026-04-26
commits:
  - b2bce16: Group 1 — newsletter subscribe + checkout save-intent
  - 6b3cc28: Group 2 — Paystack webhook
  - 799ffc9: Group 3 — admin products (POST/PUT/DELETE/toggle-active)
  - 4bf699c: Group 4 — admin orders + reviews
  - 2c69a3b: Group 5 — admin FAQs + pages (about_sections)
  - e298553: Group 6 — admin blog
  - cfe7b96: Group 7 — admin shipping + settings
---

# Phase 11 Plan 01 Task 3: Migrate DB Write Paths to Drizzle

## Files Migrated (16 total)

### Group 1: Newsletter + checkout save-intent
- `src/app/api/newsletter/subscribe/route.ts` — replaced `createAdminClient` + `supabase.from('newsletter_subscribers').insert()` with `db.insert(newsletterSubscribers).values({firstName, email, sourcePage})`. 23505 unique constraint handled via try/catch on Drizzle throw.
- `src/app/api/checkout/save-intent/route.ts` — replaced inline `createClient` (service-role) + `supabase.from('abandoned_orders').insert()` with `db.insert(abandonedOrders).values(...)`. NUMERIC(10,2) columns (`shippingCost`, `subtotal`, `total`) passed as `.toString()` strings per plan spec.

### Group 2: Paystack webhook
- `src/app/api/webhooks/paystack/route.ts` — replaced inline `createClient` (service-role) with `db` throughout. Idempotency guard converted to `db.select().from(orders).where(eq(...)).limit(1)`. Order insert uses `db.insert(orders).values(camelCase).returning({id})`. Order items insert uses `db.insert(orderItems).values(items)` — throws propagate for Paystack retry. Abandoned order recovery uses `db.update(abandonedOrders).set({recovered: true, recoveredAt: new Date()}).where(and(...))` with `new Date()` (not ISO string). HMAC signature verification preserved intact.

### Group 3: Admin products
- `src/app/api/admin/products/route.ts` — `db.insert(products).values(camelCase).returning()` with 23505 slug conflict handling.
- `src/app/api/admin/products/[id]/route.ts` — `db.update(products).set(camelCase).where(eq).returning()` for PUT; `db.delete(products).where(eq)` for DELETE. 23505 handling on slug conflicts.
- `src/app/api/admin/products/[id]/toggle-active/route.ts` — `db.select({isActive})` then `db.update(products).set({isActive: newValue})`.

### Group 4: Admin orders + reviews
- `src/app/api/admin/orders/[id]/route.ts` — `db.select` to verify existence, `db.update(orders).set({status})`.
- `src/app/api/admin/reviews/route.ts` — `db.insert(reviews).values({productId, authorName, body, rating}).returning()`.
- `src/app/api/admin/reviews/[id]/route.ts` — `db.update(reviews).set({authorName, body, rating}).where(eq).returning()` for PUT; `db.delete(reviews).where(eq)` for DELETE.

### Group 5: Admin FAQs + pages
- `src/app/api/admin/faqs/route.ts` — `db.insert(faqs).values({category, question, answer, displayOrder}).returning()`.
- `src/app/api/admin/faqs/[id]/route.ts` — `db.select` for existence check; `db.update(faqs).set(camelCase displayOrder)` for PUT; `db.delete(faqs)` for DELETE.
- `src/app/api/admin/pages/route.ts` — `db.insert(aboutSections).values(rows).onConflictDoUpdate({target: aboutSections.id, set: {title: sql\`excluded.title\`, body: sql\`excluded.body\`, imageUrl: sql\`excluded.image_url\`, displayOrder: sql\`excluded.display_order\`}})`. Full multi-column upsert replacing Supabase `.upsert(rows, {onConflict: 'id'})`.

### Group 6: Admin blog
- `src/app/api/admin/blog/route.ts` — `db.insert(blogPosts).values({..., featuredImage, publishedAt: Date|null}).returning()`. `publishedAt` uses `new Date(published_at)` or `new Date()` (not ISO strings). 23505 for slug conflicts.
- `src/app/api/admin/blog/[id]/route.ts` — `db.select` for existence + published state detection; `db.update(blogPosts).set({..., publishedAt: new Date(), updatedAt: new Date()}).returning()`. DELETE uses `db.delete(blogPosts).where(eq)`.

### Group 7: Admin shipping + settings
- `src/app/api/admin/shipping/route.ts` — `db.insert(settings).values(rows).onConflictDoUpdate({target: settings.key, set: {value: sql\`excluded.value\`}})`.
- `src/app/api/admin/settings/route.ts` — same upsert pattern for arbitrary key-value pairs.

## Notable Patterns

**NUMERIC(10,2) string passing:** `shippingCost`, `subtotal`, `total` in `abandoned_orders` are Drizzle `numeric()` columns that expect string inputs. All inserts pass `.toString()` values.

**Date objects for timestamps:** Drizzle timestamp columns accept `Date` objects directly. All `publishedAt`, `updatedAt`, `recoveredAt` assignments use `new Date()` or `new Date(isoString)` instead of `.toISOString()` strings used in the Supabase pattern.

**23505 unique constraint handling:** newsletter (email), products (slug), blog posts (slug) — all three preserved via try/catch checking `(err as {code?: string}).code === '23505'`.

**Multi-column upsert for about_sections:** Used `sql\`excluded.column_name\`` template for each column individually since Drizzle's `onConflictDoUpdate.set` requires explicit column mapping (unlike Supabase's blanket `.upsert()`).

**Auth preserved:** All `createClient` imports from `@/lib/supabase/server` and `supabase.auth.getUser()` calls are untouched in all 13 admin routes. 38 auth call sites confirmed intact across the codebase.

**Paystack webhook:** Removed the abandoned `orderResult.error` branch pattern (Supabase returned `{data, error}`) — Drizzle throws on failure, so insert errors are caught by the outer try/catch in `POST()` which returns non-200 for Paystack retry.

## Verification Results

- Zero `supabase.from` / `createAdminClient` / `adminClient.from` / `from '@supabase/supabase-js'` calls remain in `src/app/api/` or `src/app/(admin)/`
- `npx tsc --noEmit` passes clean after every group
- 38 `supabase.auth.*` calls preserved (Plan 02 will migrate these)
