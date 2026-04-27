---
plan: 11-01
phase: 11
status: complete
completed: 2026-04-27
commits:
  - bf9ea63
  - 279bec5
  - f0a5368
  - 6a3ff2b
  - 0461e65
  - 131e0d7
  - b022fea
  - 4970f4b
  - 49d309a
  - b2bce16
  - 6b3cc28
  - 799ffc9
  - 4bf699c
  - 2c69a3b
  - e298553
  - cfe7b96
---

## Summary

Replaced Supabase PostgreSQL with Neon/Drizzle across the entire codebase. All 10 production tables provisioned in Neon, 50+ application files migrated from `supabase.from()` to typed Drizzle queries.

## What Was Built

- **`src/db/schema.ts`** — 10 tables (products, reviews, orders, order_items, settings, about_sections, faqs, blog_posts, newsletter_subscribers, abandoned_orders) + relations (orders→orderItems, reviews→products)
- **`src/db/index.ts`** — Neon HTTP driver + `db` Drizzle client + re-exports
- **`src/db/columns.ts`** — Row types via `$inferSelect` replacing `src/types/supabase.ts`
- **`drizzle.config.ts`** — drizzle-kit config using `DATABASE_URL_UNPOOLED`
- **17 storefront/orders/admin pages** migrated from `supabase.from()` to Drizzle reads
- **16 API routes** migrated from Supabase writes to Drizzle writes

## Schema Decisions

### Column type quirks preserved exactly
- `orders.shipping_cost / subtotal / total` → `integer` (kobo, NOT numeric)
- `abandoned_orders.shipping_cost / subtotal / total` → `numeric(10,2)` (from migration SQL)
- `products.variants`, `orders.paystack_payload`, `abandoned_orders.cart_items` → `jsonb`
- `about_sections.id` → `text` PK (values: 'founder-story' | 'brand-mission' | 'why-loc-beads' | 'contact')
- `products.images` → `text[]` with `default([])`
- `reviews.rating` → `integer` with manual `CHECK (rating BETWEEN 1 AND 5)` added via psql

### NUMERIC(10,2) handling
`abandonedOrders.shippingCost/subtotal/total` return strings from Drizzle (default for numeric). INSERTs receive `.toString()` values; read sites use `Number(row.shippingCost)`.

## camelCase Migration Strategy

Applied **Path 2 (boundary mapping)** for public storefront pages (catalog, blog, about, faq, shipping, orders) — these already mapped DB rows to snake_case domain types from `@/lib/types/product`. The mapping now reads from camelCase Drizzle fields.

Applied **Path 1 (camelCase throughout)** for admin pages and API routes that consume DB rows directly without a domain-type layer.

## Data Migration
Neon DB was pre-populated via `pg_dump / pg_restore` before this plan executed. Smoke test confirmed `OK rows: 1` (data present). All 10 tables provisioned with correct column types.

## Remaining Supabase Usage (intentional)
- **Auth:** 38 `supabase.auth.*` call sites preserved — Plan 02 migrates these
- **Storage:** 3 files (ImageUploader, BlogPostForm, AboutPagesForm) — Plan 03 migrates these
- **Packages:** `@supabase/ssr`, `@supabase/supabase-js` still installed — Plan 03 uninstalls

## Acceptance Criteria Status
- [x] `supabase.from()` calls: 0 in src/
- [x] `createAdminClient` callers: 0 (definition only in admin.ts — Plan 03 deletes)
- [x] Drizzle artifacts exist: schema.ts, index.ts, columns.ts, drizzle.config.ts
- [x] 10 tables in Neon
- [x] package.json: drizzle-orm, @neondatabase/serverless, drizzle-kit, tsx
- [x] .env.local.example: DATABASE_URL, DATABASE_URL_UNPOOLED
- [x] `npx tsc --noEmit` passes
- [x] Auth call sites preserved (38 matches)
- [x] Storage call sites preserved (3 files)
