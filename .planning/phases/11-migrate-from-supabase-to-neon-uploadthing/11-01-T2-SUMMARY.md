---
phase: "11"
plan: "01-T2"
subsystem: "database"
tags: ["drizzle", "migration", "read-paths", "admin", "neon"]
key-files:
  modified:
    - src/app/sitemap.ts
    - src/app/orders/[reference]/page.tsx
    - src/app/api/orders/[reference]/route.ts
    - src/app/(admin)/admin/(protected)/page.tsx
    - src/app/(admin)/admin/(protected)/products/page.tsx
    - src/app/(admin)/admin/(protected)/products/[id]/page.tsx
    - src/app/(admin)/admin/(protected)/orders/page.tsx
    - src/app/(admin)/admin/(protected)/orders/[id]/page.tsx
    - src/app/(admin)/admin/(protected)/reviews/page.tsx
    - src/app/(admin)/admin/(protected)/faqs/page.tsx
    - src/app/(admin)/admin/(protected)/faqs/[id]/page.tsx
    - src/app/(admin)/admin/(protected)/pages/page.tsx
    - src/app/(admin)/admin/(protected)/blog/page.tsx
    - src/app/(admin)/admin/(protected)/blog/[id]/page.tsx
    - src/app/(admin)/admin/(protected)/shipping/page.tsx
    - src/app/(admin)/admin/(protected)/settings/page.tsx
    - src/app/(admin)/admin/(protected)/abandoned-orders/[id]/page.tsx
decisions:
  - "Kept all supabase.auth.getUser() calls — auth migration is Plan 02's responsibility"
  - "Applied camelCase->snake_case boundary mapping at DB call site to satisfy existing component prop types"
  - "Used db.query.orders.findFirst with orderItems relation for order detail pages (avoids separate JOIN)"
  - "Used db.select with leftJoin for reviews page to get product name in one query"
  - "Cast Drizzle jsonb (unknown) to Json type from @/types/supabase for paystack_payload field"
metrics:
  completed: "2026-04-26"
  files_modified: 17
  groups_committed: 7
---

# Phase 11 Plan 01 Task 2 Summary: Migrate READ paths to Drizzle

One-liner: Replaced all `supabase.from()` read calls in admin pages, orders pages, and sitemap with Drizzle `db.select()` / `db.query` equivalents, preserving snake_case boundary mapping for existing components.

## What Was Migrated

### Group 1 — Sitemap + Orders pages
- **sitemap.ts**: `createClient` removed, replaced with `db.select` from `products` and `blogPosts` with `eq` filters
- **orders/[reference]/page.tsx**: Inline service-role Supabase client replaced with `db.query.orders.findFirst({ with: { orderItems } })`, full snake_case mapping for `OrderConfirmationView`
- **api/orders/[reference]/route.ts**: Same as above for the polling API route

### Group 2 — Admin dashboard + products
- **admin/page.tsx**: `createAdminClient` orders query → `db.select` with selected columns, snake_case mapping for `RecentOrdersTable` / `StatsPanel`
- **products/page.tsx**: `createAdminClient` → `db.select`, snake_case mapping for `ProductListTable`
- **products/[id]/page.tsx**: `createAdminClient` → `db.select+eq`, full snake_case mapping for `ProductForm`
- **products/new/page.tsx**: Auth-only page, no data calls — no change needed

### Group 3 — Admin orders + reviews
- **orders/page.tsx**: Both `orders` and `abandoned_orders` tables migrated, `Promise.all` preserved, snake_case mapping for both table components
- **orders/[id]/page.tsx**: `db.query.orders.findFirst` with `orderItems` relation, full `FullOrder` snake_case mapping
- **reviews/page.tsx**: `db.select().from(reviews).leftJoin(products, eq(reviews.productId, products.id))` replaces Supabase nested select; maps to `ReviewRow`

### Group 4 — FAQs + pages (about)
- **faqs/page.tsx**: `db.select().orderBy(asc(faqs.category), asc(faqs.displayOrder))`, snake_case mapping
- **faqs/[id]/page.tsx**: `db.select+eq`, snake_case `Faq` mapping for `FaqForm`
- **pages/page.tsx**: `db.select().orderBy(asc(aboutSections.displayOrder))`, snake_case `AboutSection` mapping for `AboutPagesForm`

### Group 5 — Blog + shipping
- **blog/page.tsx**: `db.select` with selected columns, snake_case mapping for table render
- **blog/[id]/page.tsx**: `db.select+eq`, full snake_case `BlogPost` mapping for `BlogPostForm`
- **shipping/page.tsx**: `db.select().where(inArray(settings.key, SHIPPING_KEYS))` replaces `.in()` Supabase filter
- **blog/new/page.tsx**: Auth-only, no change

### Group 6 — Settings + abandoned orders detail
- **settings/page.tsx**: `db.select` from all settings rows
- **abandoned-orders/[id]/page.tsx**: `db.select+eq`, inline snake_case mapping, `Number()` cast for `numeric` Drizzle fields, removed `@/types/supabase` import

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript error: Drizzle `jsonb` returns `unknown`, not `Json`**
- **Found during:** `npx tsc --noEmit` after all groups
- **Issue:** `paystack_payload: result.paystackPayload` — Drizzle types `jsonb` as `unknown` but `@/types/supabase` `Order.paystack_payload` is typed as `Json`
- **Fix:** Added `import { Json } from '@/types/supabase'` and cast `result.paystackPayload as Json` in both affected files
- **Files modified:** `src/app/orders/[reference]/page.tsx`, `src/app/(admin)/admin/(protected)/orders/[id]/page.tsx`
- **Commit:** 49d309a

### Intentional Omissions
- `products/new/page.tsx` and `blog/new/page.tsx` — auth-only pages with no `supabase.from()` calls; no changes made
- All `supabase.auth.getUser()` calls preserved in every admin page per critical rule (Plan 02 owns auth migration)
- `@supabase/supabase-js` and `src/lib/supabase/` files untouched (Plan 03 owns removal)

## Known Stubs
None — all data flows are wired to real Drizzle queries.

## Self-Check
All 17 files modified exist on disk. `npx tsc --noEmit` exits clean (0). `grep -rn "supabase\.from("` across all target directories returns ALL CLEAR.
