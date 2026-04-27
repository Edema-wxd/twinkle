# Phase 11: Migrate from Supabase to Neon + Uploadthing - Research

**Researched:** 2026-04-26
**Domain:** Database migration (Supabase PostgreSQL → Neon serverless PostgreSQL) + file storage migration (Supabase Storage → Uploadthing)
**Confidence:** HIGH (codebase fully audited; official docs verified)

---

## Summary

This phase migrates two distinct Supabase services: the PostgreSQL database (to Neon) and the file/image storage (to Uploadthing). The **auth system** (Supabase Auth) must also be replaced — it is deeply embedded in the middleware, protected layout, login actions, and every admin API route. This is the most complex of the three migration surfaces.

The project does **not** currently use Drizzle ORM. All database access uses the `@supabase/supabase-js` and `@supabase/ssr` query builders. Neon with Drizzle ORM is the standard stack for this migration and provides a typed, schema-driven query layer that replaces the Supabase typed client entirely.

The project also does **not** use Supabase Realtime — the `OrderPoller` component was previously using Realtime but the current code (Phase 10 fix) polls via a plain API route instead. No Realtime replacement is needed.

**Primary recommendation:** Migrate in three sequential waves: (1) database + Drizzle schema, (2) auth replacement with better-auth, (3) Uploadthing storage replacement. Do not attempt all three at once — the DB layer must be stable before swapping auth cookies that depend on it.

---

## Runtime State Inventory

> This phase involves migrating a live database. All five categories must be answered.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data (DB) | Neon is empty — all data lives in Supabase PostgreSQL: products, reviews, orders, order_items, abandoned_orders, newsletter_subscribers, settings, about_sections, faqs, blog_posts | pg_dump from Supabase → pg_restore to Neon (data migration) |
| Live service config | Supabase Storage buckets `product-images` and `content-images` contain uploaded files — these are not in git | Files must be downloaded from Supabase Storage and re-uploaded to Uploadthing; OR existing Supabase public URLs left intact in DB and only future uploads go to Uploadthing |
| OS-registered state | None — no task scheduler entries, pm2 processes, or OS registrations found | None |
| Secrets/env vars | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in Vercel environment and `.env.local`. `UPLOADTHING_TOKEN` already present in `.env.local.example` (not yet in `.env.local`) | Remove Supabase vars; add `DATABASE_URL` (Neon), `BETTER_AUTH_SECRET`, `UPLOADTHING_TOKEN`; update Vercel env vars |
| Build artifacts | `@supabase/ssr` and `@supabase/supabase-js` will become unused after migration — remove from `package.json`. `supabase` devDependency (CLI) can be removed. | `npm uninstall @supabase/ssr @supabase/supabase-js supabase` after migration |

**Critical image decision:** Existing uploaded image URLs in the `products.images` column and `about_sections.image_url` / `blog_posts.featured_image` columns are Supabase Storage URLs (`*.supabase.co`). These will break if the Supabase project is deleted. Strategy options:
1. **Keep Supabase project active** for image serving only, migrate to Uploadthing for future uploads (simplest — no data migration of files)
2. **Re-upload all existing images** to Uploadthing, update URL columns in DB (complete migration, but requires manual effort per image)

[ASSUMED] Strategy 1 (keep Supabase for existing images, Uploadthing for new uploads) is the pragmatic choice during v1 since product catalog images may be limited in number and can be re-uploaded manually through the admin panel after migration completes. Confirm with user.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@neondatabase/serverless` | 1.1.0 | Neon HTTP driver for serverless | Required for Vercel edge/serverless — avoids persistent connection limits [VERIFIED: npm registry] |
| `drizzle-orm` | 0.45.2 | Type-safe SQL query builder | Native TypeScript types from schema; replaces `@supabase/supabase-js` query builder [VERIFIED: npm registry] |
| `drizzle-kit` | 0.31.10 | Migration generator + schema diff | Generates SQL migrations from TS schema; `drizzle-kit push` for rapid iteration [VERIFIED: npm registry] |
| `better-auth` | 1.6.9 | Email/password auth + session management | Replaces Supabase Auth; integrates with Drizzle; Next.js 15 App Router support [VERIFIED: npm registry] |
| `uploadthing` | 7.7.4 | File upload service | Replaces Supabase Storage; purpose-built for Next.js App Router [VERIFIED: npm registry] |
| `@uploadthing/react` | 7.3.3 | React components for Uploadthing | `generateUploadButton`, `generateUploadDropzone` components [VERIFIED: npm registry] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tsx` | latest | Run TypeScript migration scripts | One-off migration runner: `npx tsx migrate.ts` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `better-auth` | `next-auth` v5 | better-auth has native Drizzle adapter and is purpose-built for App Router; next-auth v5 is still in beta for full App Router session handling [ASSUMED] |
| `better-auth` | Custom JWT cookies | Hand-rolling JWT auth has CVE surface area; better-auth handles session rotation, CSRF, and secure cookie configuration correctly [ASSUMED] |
| Uploadthing | AWS S3 / Cloudflare R2 | Uploadthing requires zero infrastructure setup; native Next.js App Router route handler pattern; simpler for one-admin store [ASSUMED] |

**Installation (new packages):**
```bash
npm install drizzle-orm @neondatabase/serverless better-auth uploadthing @uploadthing/react
npm install -D drizzle-kit
```

**Removal (Supabase packages):**
```bash
npm uninstall @supabase/ssr @supabase/supabase-js supabase
```

**Version verification:** Confirmed via `npm view` on 2026-04-26.

---

## Architecture Patterns

### Recommended Project Structure After Migration

```
src/
├── lib/
│   ├── db/
│   │   ├── index.ts          # Drizzle client (replaces src/lib/supabase/*)
│   │   └── schema.ts         # Full Drizzle schema (all 10 tables)
│   ├── auth/
│   │   └── index.ts          # better-auth instance (replaces Supabase Auth)
│   └── uploadthing/
│       └── index.ts          # generateUploadButton / generateUploadDropzone exports
├── app/
│   └── api/
│       ├── auth/
│       │   └── [...all]/route.ts   # better-auth catch-all handler
│       └── uploadthing/
│           ├── core.ts             # FileRouter definition
│           └── route.ts            # createRouteHandler export
```

Delete entirely: `src/lib/supabase/` (server.ts, client.ts, admin.ts)

### Pattern 1: Neon HTTP Driver + Drizzle

**What:** Use `@neondatabase/serverless` HTTP transport (not WebSockets) for Vercel serverless compatibility. Each request gets a stateless HTTP connection — no connection pool management needed.

**When to use:** All database queries. HTTP driver is recommended for Next.js serverless; WebSocket driver is only needed for interactive transactions.

**Example:**
```typescript
// Source: https://orm.drizzle.team/docs/connect-neon
// src/lib/db/index.ts
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

export const db = drizzle(process.env.DATABASE_URL!, { schema })
```

```typescript
// Query pattern (replaces supabase.from('products').select('*'))
const products = await db.select().from(schema.products)
const product = await db.select().from(schema.products)
  .where(eq(schema.products.slug, slug))
  .limit(1)
```

### Pattern 2: Drizzle Schema Definition

**What:** TypeScript-first schema that generates both types AND SQL migrations. Replaces the hand-maintained `src/types/supabase.ts`.

**When to use:** Define once in `schema.ts`; Drizzle infers all TypeScript types from it.

**Example:**
```typescript
// Source: https://neon.com/docs/guides/drizzle-migrations
// src/lib/db/schema.ts (partial)
import { pgTable, uuid, text, boolean, integer, jsonb, numeric, timestamp } from 'drizzle-orm/pg-core'

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull().default(''),
  seoDescription: text('seo_description'),
  image: text('image').notNull().default('/images/products/placeholder-bead.svg'),
  images: text('images').array().notNull().default([]),
  material: text('material').notNull(),
  isFeatured: boolean('is_featured').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  priceMin: integer('price_min').notNull(),
  priceMax: integer('price_max').notNull(),
  variants: jsonb('variants').notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// Infer types from schema (replaces manual Database['public']['Tables']['products']['Row'])
export type Product = typeof products.$inferSelect
export type ProductInsert = typeof products.$inferInsert
```

### Pattern 3: better-auth Setup

**What:** Email/password auth with session cookies. Replaces Supabase's `supabase.auth.signInWithPassword`, `signOut`, and `getUser`.

**When to use:** Admin login/logout, session validation in middleware and per-page layouts, API route auth checks.

**Example:**
```typescript
// Source: https://better-auth.com/docs/integrations/next
// src/lib/auth/index.ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/lib/db'

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: true },
  secret: process.env.BETTER_AUTH_SECRET!,
})

export type Session = typeof auth.$Infer.Session
```

```typescript
// app/api/auth/[...all]/route.ts
import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'
export const { GET, POST } = toNextJsHandler(auth)
```

```typescript
// middleware.ts — replace Supabase session refresh
// Source: https://better-auth.com/docs/integrations/next
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
// Use Node.js runtime (Next.js 15.2+) for full session validation
export const config = { runtime: 'nodejs', matcher: [...] }
```

### Pattern 4: Uploadthing FileRouter

**What:** Define named upload endpoints (like route handlers) with file type constraints and auth middleware. Two endpoints needed: `productImages` and `contentImages`.

**When to use:** Replaces all three `supabase.storage.from('...').upload()` calls in `ImageUploader.tsx`, `BlogPostForm.tsx`, `AboutPagesForm.tsx`.

**Example:**
```typescript
// Source: https://docs.uploadthing.com/getting-started/appdir
// src/app/api/uploadthing/core.ts
import { createUploadthing, type FileRouter } from 'uploadthing/next'
import { UploadThingError } from 'uploadthing/server'
import { auth } from '@/lib/auth'

const f = createUploadthing()

export const ourFileRouter = {
  productImages: f({ image: { maxFileSize: '4MB', maxFileCount: 5 } })
    .middleware(async ({ req }) => {
      const session = await auth.api.getSession({ headers: req.headers })
      if (!session) throw new UploadThingError('Unauthorized')
      return {}
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl }
    }),
  contentImages: f({ image: { maxFileSize: '8MB', maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      const session = await auth.api.getSession({ headers: req.headers })
      if (!session) throw new UploadThingError('Unauthorized')
      return {}
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
```

```typescript
// src/app/api/uploadthing/route.ts
import { createRouteHandler } from 'uploadthing/next'
import { ourFileRouter } from './core'
export const { GET, POST } = createRouteHandler({ router: ourFileRouter })
```

```typescript
// src/lib/uploadthing/index.ts
import { generateUploadButton, generateUploadDropzone } from '@uploadthing/react'
import type { OurFileRouter } from '@/app/api/uploadthing/core'
export const UploadButton = generateUploadButton<OurFileRouter>()
export const UploadDropzone = generateUploadDropzone<OurFileRouter>()
```

### Pattern 5: ImageUploader Replacement

**What:** The current `ImageUploader.tsx` calls `supabase.storage.from('product-images').upload()` directly from the browser. The Uploadthing version uses `useUploadThing` hook or the `UploadDropzone` component — both return the file URL on complete.

**Key difference:** Uploadthing handles multipart upload itself; the component receives a `onClientUploadComplete` callback with `res[].ufsUrl` (the CDN URL). The upload logic is simpler — no manual path construction, no `getPublicUrl` call.

### Anti-Patterns to Avoid

- **Running pg_restore over a pooled connection string:** Neon has both pooled (`-pooler` in hostname) and unpooled connection strings. Always use the **unpooled** string for `pg_dump` / `pg_restore` and schema migrations. Use the **pooled** string in `DATABASE_URL` for application queries. [CITED: neon.com/docs/import/migrate-from-supabase]
- **Using `@supabase/ssr` middleware for session refresh in parallel with better-auth:** Remove the entire Supabase middleware session refresh block. The new middleware uses `auth.api.getSession()` from better-auth instead. Do not run both simultaneously.
- **Keeping `NEXT_PUBLIC_SUPABASE_URL` in the client bundle:** This env var is exposed to the browser. Remove it from `next.config.ts` or any NEXT_PUBLIC_ exposure once the migration is complete.
- **Forgetting `*.supabase.co` in `next.config.ts` remotePatterns:** If keeping Supabase for existing image serving, the current `*.supabase.co` pattern must remain. If fully migrating, replace with `<APP_ID>.ufs.sh`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session management | Custom JWT cookies, manual HMAC | `better-auth` | Handles session rotation, CSRF protection, secure cookie flags, secret key management |
| SQL type safety | Manual type assertions, `as unknown as X` casts | Drizzle schema + `$inferSelect` | All DB types derived from schema; eliminates the hand-maintained `supabase.ts` with its `Relationships: []` workarounds |
| File upload progress/retry | Custom fetch with FormData | Uploadthing's `UploadDropzone` / `useUploadThing` | Handles chunked upload, retry, progress events, content-type detection |
| Database migrations | Manual SQL scripts run in Supabase dashboard | `drizzle-kit generate` + `drizzle-kit push` | Generates diff-based SQL migrations; never runs destructive migrations accidentally |
| Password hashing | `bcrypt` calls | `better-auth` | Built-in; uses Argon2 by default |

---

## Common Pitfalls

### Pitfall 1: Supabase Auth Cookie Format vs. better-auth Cookies

**What goes wrong:** After replacing the auth system, existing admin sessions (cookies) will be invalid. Admin will be logged out.
**Why it happens:** Supabase Auth stores sessions under `sb-*` cookie names; better-auth uses its own cookie format.
**How to avoid:** Expected and correct. The admin must log in again after migration. No special handling needed — just communicate this expectation.
**Warning signs:** Redirect loop on `/admin` after deployment — this means the old cookie was found but better-auth doesn't recognise it. It resolves immediately on login.

### Pitfall 2: Neon Connection String — Pooled vs. Unpooled

**What goes wrong:** Running `drizzle-kit migrate` or `pg_restore` against a pooled connection string causes PgBouncer errors on prepared statements.
**Why it happens:** PgBouncer (Neon's pooler) does not support all PostgreSQL protocol features used by migration tools.
**How to avoid:** Neon dashboard provides two connection strings. Use **direct/unpooled** for migrations and schema operations; use **pooled** for `DATABASE_URL` in application code. [CITED: neon.com/docs/import/migrate-from-supabase]
**Warning signs:** Error message containing `prepared statement` or `PgBouncer` during migration.

### Pitfall 3: better-auth Tables Must Exist Before First Request

**What goes wrong:** better-auth requires its own tables (`users`, `sessions`, `accounts`, `verifications`) — it will throw on first auth request if they don't exist.
**Why it happens:** better-auth generates its schema separately from the application schema.
**How to avoid:** Run `npx @better-auth/cli generate` then `drizzle-kit push` before deploying. Create the initial admin user in Neon directly (INSERT) or via a one-time setup script before going live.
**Warning signs:** 500 error on `/admin/login` — check logs for "relation does not exist".

### Pitfall 4: Existing Supabase Image URLs in Database

**What goes wrong:** After migration, `products.images`, `about_sections.image_url`, and `blog_posts.featured_image` columns contain `https://xxxxx.supabase.co/storage/v1/object/public/...` URLs. If Supabase project is paused/deleted, these 404.
**Why it happens:** URLs are stored as absolute strings in the database — they are not relative paths.
**How to avoid:** Keep the Supabase project active for image serving initially. The admin can re-upload images through the admin panel (now using Uploadthing) which will update the DB column URLs. Supabase free tier can be kept active without cost for this purpose during a transition period.
**Warning signs:** Broken images on product pages after Supabase project is removed.

### Pitfall 5: `supabase.auth.getUser()` Called in 30+ Files

**What goes wrong:** After removing `@supabase/ssr`, any file still importing from `@/lib/supabase/server` will fail at build time.
**Why it happens:** The auth guard pattern (`const { data: { user } } = await supabase.auth.getUser()`) is used in both server page components and API routes throughout the admin.
**How to avoid:** Replace systematically — create a `getAdminSession()` helper wrapping `auth.api.getSession()`, then do a global find-replace. [VERIFIED: codebase audit — 30+ files use `supabase.auth.getUser()`]
**Warning signs:** TypeScript compile errors referencing `@/lib/supabase/server` or `createClient from '@supabase/ssr'`.

### Pitfall 6: `next.config.ts` remotePatterns Must Be Updated

**What goes wrong:** `next/image` refuses to render images from `<APP_ID>.ufs.sh` — throws "hostname not configured" error.
**Why it happens:** `next.config.ts` currently only allows `*.supabase.co`.
**How to avoid:** Add Uploadthing hostname to remotePatterns:
```typescript
{ protocol: 'https', hostname: '*.ufs.sh', pathname: '/f/*' }
```
Keep `*.supabase.co` if existing images remain on Supabase Storage.
**Warning signs:** Console error "Image with src `https://xxx.ufs.sh/...` cannot be optimized because it is not listed in `next.config.ts`".

### Pitfall 7: `drizzle-kit push` vs. `drizzle-kit migrate` on Seeded Data

**What goes wrong:** `drizzle-kit push` is destructive on tables with data — it drops and recreates columns that changed type.
**Why it happens:** `push` is for development iteration; `migrate` runs incremental SQL files and is safe for production.
**How to avoid:** After initial schema push (empty DB), always use `drizzle-kit generate` to create a migration file, then `drizzle-kit migrate` to apply it. Never use `push` against a Neon database that has real customer data. [CITED: orm.drizzle.team/docs/connect-neon]

---

## Code Examples

### Drizzle Query Equivalents to Supabase

```typescript
// Source: https://orm.drizzle.team/docs/connect-neon + codebase audit

// BEFORE (Supabase): supabase.from('products').select('*').eq('is_active', true)
// AFTER (Drizzle):
const products = await db.select().from(schema.products)
  .where(eq(schema.products.isActive, true))

// BEFORE: supabase.from('products').select('*').eq('slug', slug).single()
// AFTER:
const [product] = await db.select().from(schema.products)
  .where(eq(schema.products.slug, slug))
  .limit(1)
// Guard: if (!product) return notFound()

// BEFORE: supabase.from('orders').insert(orderInsert).select('id').single()
// AFTER:
const [order] = await db.insert(schema.orders).values(orderInsert).returning({ id: schema.orders.id })

// BEFORE: supabase.from('orders').update({ status }).eq('id', id)
// AFTER:
await db.update(schema.orders).set({ status }).where(eq(schema.orders.id, id))

// BEFORE: supabase.from('products').select('*').eq('slug', slug).maybeSingle()
// AFTER: same as .limit(1) — returns undefined if not found (no error thrown)
```

### better-auth Session Check (replaces supabase.auth.getUser)

```typescript
// Source: https://better-auth.com/docs/integrations/next

// BEFORE (Supabase server component):
// const supabase = await createClient()
// const { data: { user } } = await supabase.auth.getUser()
// if (!user) redirect('/admin/login')

// AFTER (better-auth server component):
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

const session = await auth.api.getSession({ headers: await headers() })
if (!session) redirect('/admin/login')
```

### better-auth Login / Logout (replaces loginAction / logoutAction)

```typescript
// Source: https://better-auth.com/docs/basic-usage
// BEFORE: supabase.auth.signInWithPassword({ email, password })
// AFTER:
import { auth } from '@/lib/auth'

// In server action:
const { data, error } = await auth.api.signInWithEmailAndPassword({
  body: { email, password },
  headers: await headers(),
})

// Logout:
await auth.api.signOut({ headers: await headers() })
```

### Data Migration Script

```typescript
// One-time script: run with `npx tsx scripts/migrate-data.ts`
// Reads from Supabase (via pg_dump/pg_restore — preferred) or programmatically
// pg_dump approach (recommended — preserves JSONB, arrays, exact types):

// 1. Export: pg_dump -Fc -v -d "$SUPABASE_DB_URL" --schema=public -f dump.bak
// 2. Restore: pg_restore -d "$NEON_DIRECT_URL" -v --no-owner --no-acl dump.bak
// Note: RLS policies will be included in dump — review and drop them on Neon
//       since Neon uses different auth model (no auth.uid() function)
```

---

## Environment Variable Changes

### Variables to Remove

| Variable | Where Used | Why Removed |
|----------|-----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `src/lib/supabase/*`, 4 inline usages | Replaced by `DATABASE_URL` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `src/lib/supabase/client.ts`, `server.ts`, `middleware.ts` | Supabase client removed |
| `SUPABASE_SERVICE_ROLE_KEY` | `src/lib/supabase/admin.ts`, 3 inline usages in API routes | Replaced by Drizzle direct DB access |

### Variables to Add

| Variable | Where Used | Notes |
|----------|-----------|-------|
| `DATABASE_URL` | `src/lib/db/index.ts` | Neon **pooled** connection string for application queries |
| `DATABASE_URL_UNPOOLED` | `drizzle.config.ts`, migration scripts | Neon **direct** connection string for migrations |
| `BETTER_AUTH_SECRET` | `src/lib/auth/index.ts` | 32+ char random secret — `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | `src/lib/auth/index.ts` | Base URL: `https://twinklelocs.com` (production) |
| `UPLOADTHING_TOKEN` | `src/app/api/uploadthing/core.ts` | Already in `.env.local.example` — just needs actual value |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Supabase RLS for public data access | No RLS needed — Drizzle queries run server-side only | Phase 11 | All DB access is already server-side (Server Components + API routes); no client-side DB access in this codebase |
| `supabase.auth.getClaims()` in middleware | `better-auth` session cookie check | Phase 11 | Must update `config.matcher` and remove Step 2 from middleware |
| `supabase.storage` for image upload | Uploadthing FileRouter + `useUploadThing` hook | Phase 11 | Simpler upload code; no manual path construction |
| Hand-maintained `src/types/supabase.ts` | Drizzle `$inferSelect` / `$inferInsert` types | Phase 11 | Types auto-generated from schema; never drift from DB reality |
| Supabase browser client for storage | Uploadthing client component | Phase 11 | Supabase browser client (`createBrowserClient`) removed entirely |

**Deprecated/outdated:**
- `Realtime` subscription: Was used in earlier OrderPoller design (Phase 5). Removed in Phase 10 fix — now uses plain polling. No Realtime to migrate.
- `supabase.auth.getClaims()`: This was called in middleware as a "refresh" step (not a guard). The better-auth equivalent is `auth.api.getSession()`, which validates against the session store.

---

## Supabase Usage Audit (Full Scope)

### Database Query Files (replace with Drizzle)

All files using `supabase.from('table_name')` — sorted by category:

**Public pages (Server Components):**
- `src/app/catalog/page.tsx`
- `src/app/catalog/[slug]/page.tsx`
- `src/app/about/page.tsx`
- `src/app/faq/page.tsx`
- `src/app/shipping/page.tsx`
- `src/app/blog/page.tsx`
- `src/app/blog/[slug]/page.tsx`
- `src/app/sitemap.ts`

**Order flow (Server Components + API routes):**
- `src/app/orders/[reference]/page.tsx` — inline `createClient` (supabase-js)
- `src/app/api/orders/[reference]/route.ts` — inline `createClient` (supabase-js)
- `src/app/api/webhooks/paystack/route.ts` — inline `createClient` (supabase-js)
- `src/app/api/checkout/save-intent/route.ts` — inline `createClient` (supabase-js)
- `src/app/api/newsletter/subscribe/route.ts`

**Admin pages (Server Components):**
- `src/app/(admin)/admin/(protected)/page.tsx`
- `src/app/(admin)/admin/(protected)/products/page.tsx`
- `src/app/(admin)/admin/(protected)/products/new/page.tsx`
- `src/app/(admin)/admin/(protected)/products/[id]/page.tsx`
- `src/app/(admin)/admin/(protected)/orders/page.tsx`
- `src/app/(admin)/admin/(protected)/orders/[id]/page.tsx`
- `src/app/(admin)/admin/(protected)/reviews/page.tsx`
- `src/app/(admin)/admin/(protected)/faqs/page.tsx`
- `src/app/(admin)/admin/(protected)/faqs/[id]/page.tsx`
- `src/app/(admin)/admin/(protected)/pages/page.tsx`
- `src/app/(admin)/admin/(protected)/blog/page.tsx`
- `src/app/(admin)/admin/(protected)/blog/new/page.tsx`
- `src/app/(admin)/admin/(protected)/blog/[id]/page.tsx`
- `src/app/(admin)/admin/(protected)/shipping/page.tsx`
- `src/app/(admin)/admin/(protected)/settings/page.tsx`
- `src/app/(admin)/admin/(protected)/abandoned-orders/[id]/page.tsx`

**Admin API routes:**
- `src/app/api/admin/products/route.ts`
- `src/app/api/admin/products/[id]/route.ts`
- `src/app/api/admin/products/[id]/toggle-active/route.ts`
- `src/app/api/admin/orders/[id]/route.ts`
- `src/app/api/admin/reviews/route.ts`
- `src/app/api/admin/reviews/[id]/route.ts`
- `src/app/api/admin/faqs/route.ts`
- `src/app/api/admin/faqs/[id]/route.ts`
- `src/app/api/admin/blog/route.ts`
- `src/app/api/admin/blog/[id]/route.ts`
- `src/app/api/admin/pages/route.ts`
- `src/app/api/admin/shipping/route.ts`
- `src/app/api/admin/settings/route.ts`

### Auth Files (replace with better-auth)

- `src/lib/supabase/server.ts` — `createServerClient` for cookie-based auth → **delete**
- `src/lib/supabase/client.ts` — `createBrowserClient` for browser uploads → **delete**
- `src/lib/supabase/admin.ts` — `createClient` with service role for data → **delete**
- `middleware.ts` — Supabase session refresh + `supabase.auth.getUser()` guard → **replace**
- `src/app/(admin)/admin/login/actions.ts` — `signInWithPassword`, `signOut` → **replace**
- `src/app/(admin)/admin/(protected)/layout.tsx` — `supabase.auth.getUser()` → **replace**
- All 30+ admin pages/routes calling `supabase.auth.getUser()` → **replace with `auth.api.getSession()`**

### Storage Files (replace with Uploadthing)

- `src/app/(admin)/_components/ImageUploader.tsx` — `product-images` bucket → **replace with Uploadthing**
- `src/app/(admin)/_components/BlogPostForm.tsx` — `content-images` bucket → **replace with Uploadthing**
- `src/app/(admin)/_components/AboutPagesForm.tsx` — `content-images` bucket → **replace with Uploadthing**

---

## Open Questions

1. **Existing image migration strategy**
   - What we know: ~6 product image URLs and a small number of about/blog image URLs stored in DB columns reference Supabase Storage (`*.supabase.co`)
   - What's unclear: Does the user want to keep Supabase active for image serving (simplest), or fully migrate all images to Uploadthing (clean break)?
   - Recommendation: Keep Supabase active for existing images; re-upload through admin panel over time. Mark Supabase project to not be deleted until images are migrated. [ASSUMED]

2. **Admin user seed in Neon**
   - What we know: Supabase Auth managed the admin user. better-auth needs its own `users` table entry.
   - What's unclear: Is there one admin account or multiple? What is the admin email?
   - Recommendation: Create a seed script or use better-auth's `auth.api.createUser()` to create the admin account in Neon before going live.

3. **Data migration timing**
   - What we know: The staging deployment (Phase 10) is running against Supabase.
   - What's unclear: Should the Neon migration run against staging first or go straight to production-equivalent?
   - Recommendation: Set up Neon as a new project. Migrate data from Supabase staging dump. Test the full stack against Neon before updating Vercel env vars.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `pg_dump` | Data migration (Supabase → Neon) | ✓ | 14.20 (Homebrew) | — |
| `psql` | Ad-hoc query verification | ✓ | 14.20 (Homebrew) | — |
| `node` / `npx` | Migration scripts, drizzle-kit | ✓ | v25.2.1 | — |
| Neon account / project | Database target | ✗ | — | Must be created at neon.tech before work begins |
| Uploadthing account / token | File upload target | ✗ | — | `UPLOADTHING_TOKEN` placeholder in `.env.local.example` — account must be created at uploadthing.com |
| better-auth secret | Auth configuration | ✗ | — | Generate with `openssl rand -hex 32` |

**Missing dependencies with no fallback:**
- Neon project must be created and `DATABASE_URL` / `DATABASE_URL_UNPOOLED` obtained before any Wave can begin
- Uploadthing account must be created and `UPLOADTHING_TOKEN` obtained before Wave 3

**Missing dependencies with fallback:**
- None

---

## Validation Architecture

> `workflow.nyquist_validation` is absent from `.planning/config.json` — treated as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — no pytest.ini, jest.config.*, vitest.config.*, or test directories found |
| Config file | None — Wave 0 must install if needed |
| Quick run command | `npm run build` (TypeScript compile — primary validation) |
| Full suite command | `npm run build && npm run lint` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DB-01 | Drizzle can connect to Neon and run a query | smoke | `npx tsx scripts/test-db.ts` | ❌ Wave 0 |
| DB-02 | All 10 tables exist and queries return correct types | smoke | `npx tsx scripts/test-db.ts` | ❌ Wave 0 |
| AUTH-01 | Admin login with email/password redirects to /admin | manual smoke | Verify in browser after deployment | — |
| AUTH-02 | Unauthenticated request to /admin redirects to /admin/login | manual smoke | Verify in browser | — |
| UPLOAD-01 | Image upload from admin panel succeeds and URL appears in product form | manual smoke | Upload via admin panel | — |
| BUILD-01 | `npm run build` completes with no TypeScript errors | automated | `npm run build` | ✅ |

### Sampling Rate

- **Per task commit:** `npm run build` — catches import errors and type mismatches immediately
- **Per wave merge:** `npm run build && npm run lint`
- **Phase gate:** Full build green + manual admin login smoke test before marking phase complete

### Wave 0 Gaps

- [ ] `scripts/test-db.ts` — verifies Neon connection and basic table queries — covers DB-01, DB-02
- [ ] `drizzle.config.ts` — needed before any `drizzle-kit` commands can run

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | better-auth email/password with Argon2 hashing |
| V3 Session Management | yes | better-auth secure session cookies (httpOnly, sameSite, secure) |
| V4 Access Control | yes | Per-page `auth.api.getSession()` check + middleware guard |
| V5 Input Validation | yes | Drizzle parameterized queries prevent SQL injection by construction |
| V6 Cryptography | yes | `BETTER_AUTH_SECRET` must be 32+ random bytes; never committed to git |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection via Drizzle | Tampering | Drizzle uses parameterized queries at the driver level — never use `db.execute(rawString)` with user input |
| Session fixation | Elevation of Privilege | better-auth rotates session ID on login — do not reuse pre-auth sessions |
| Exposed service-role key | Information Disclosure | `SUPABASE_SERVICE_ROLE_KEY` is removed from env entirely; `DATABASE_URL` is never `NEXT_PUBLIC_` prefixed |
| Unauthorized file upload | Tampering | Uploadthing FileRouter middleware checks `auth.api.getSession()` — unauthenticated upload throws UploadThingError |
| Insecure `BETTER_AUTH_SECRET` | Spoofing | Must be 32+ chars of cryptographic randomness; use `openssl rand -hex 32` |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Strategy 1 (keep Supabase for existing images, Uploadthing for new uploads) is the pragmatic approach | Runtime State Inventory | If user wants a clean break, a file-migration sub-task must be added to enumerate and re-upload all existing images |
| A2 | better-auth is preferred over next-auth v5 because of native Drizzle adapter and stable App Router support | Standard Stack | next-auth v5 may have reached stable status; validate if user prefers it |
| A3 | There is one admin user account in Supabase Auth; will be recreated in Neon via better-auth | Open Questions | If multiple admin accounts exist, the seed script must create all of them |
| A4 | No Realtime migration is needed — OrderPoller now uses polling via API route | Summary | Verify by checking OrderPoller.tsx — confirmed no `supabase.channel()` calls in current code |

**A4 is LOW risk:** Code audit confirmed OrderPoller.tsx uses only `fetch('/api/orders/${reference}')` — no Realtime. [VERIFIED: codebase grep]

---

## Sources

### Primary (HIGH confidence)
- `https://orm.drizzle.team/docs/connect-neon` — Drizzle Neon driver setup, neon-http vs neon-serverless
- `https://neon.com/docs/guides/drizzle` — Neon + Drizzle connection setup, unpooled vs pooled
- `https://neon.com/docs/guides/drizzle-migrations` — Schema definition, migration runner
- `https://neon.com/docs/import/migrate-from-supabase` — pg_dump flags, RLS handling, restore steps
- `https://docs.uploadthing.com/getting-started/appdir` — Complete App Router setup
- `https://docs.uploadthing.com/working-with-files` — File URL format (`*.ufs.sh/f/*`)
- `https://better-auth.com/docs/integrations/next` — Next.js 15 middleware, session checking
- Codebase full audit (2026-04-26) — all Supabase usage identified by grep

### Secondary (MEDIUM confidence)
- `https://neon.com/guides/complete-supabase-migration` — End-to-end migration guide
- `https://docs.uploadthing.com/api-reference/react` — generateUploadButton, generateUploadDropzone API

### Tertiary (LOW confidence)
- npm registry version data (2026-04-26) — confirmed versions for all 6 packages

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified via npm registry; docs fetched from official sources
- Architecture patterns: HIGH — code examples from official docs; Supabase usage fully audited from live codebase
- Pitfalls: HIGH — derived from codebase-specific audit (30+ auth call sites, 3 storage upload sites, inline supabase-js usage)
- Migration scope: HIGH — complete file-by-file inventory from grep audit

**Research date:** 2026-04-26
**Valid until:** 2026-05-26 (stable libraries — better-auth and Uploadthing move faster, verify versions closer to execution)
