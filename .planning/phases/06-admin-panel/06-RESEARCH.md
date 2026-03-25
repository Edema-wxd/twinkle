# Phase 6: Admin Panel - Research

**Researched:** 2026-03-25
**Domain:** Supabase Auth + Next.js 15 App Router admin UI, rich text editing, file upload, drag-and-drop
**Confidence:** HIGH (auth, storage, dnd-kit patterns) / MEDIUM (Tiptap SSR specifics)

---

## Summary

Phase 6 builds a protected `/admin` interface on top of the Supabase + Next.js 15 stack already established in earlier phases. All the hard infrastructure is in place: the middleware pattern uses `getClaims()`, the Supabase SSR client is established, and the `@supabase/ssr` package handles cookies correctly.

The admin panel requires four new capabilities beyond what exists: (1) route protection that redirects unauthenticated visitors, (2) a rich text editor for product descriptions, (3) client-side file upload to Supabase Storage with public URLs, and (4) a drag-to-reorder image grid. A fifth domain — the settings table — is a simple Supabase key-value pattern with no special library needed.

The existing `products` schema stores variants as JSONB, which is the right choice for Phase 6. The schema needs two additions: an `is_active` boolean and an `images` field (already in the TypeScript type but not yet in the SQL schema). A new `settings` table needs to be created.

**Primary recommendation:** Extend the existing middleware with an `/admin` path guard. Use Tiptap with `immediatelyRender: false` for rich text. Use Supabase Storage with a public bucket for product images. Use `@dnd-kit/sortable` for image reordering.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/ssr` | already installed | Auth + Storage client | Already in use; server + browser clients established |
| `@tiptap/react` | ^2.x (v3 available but API-breaking) | Rich text editor | SSR-safe with `immediatelyRender: false`; modular; no CDN dependency |
| `@tiptap/pm` | peer of @tiptap/react | ProseMirror engine | Required peer dependency |
| `@tiptap/starter-kit` | ^2.x | Bold, italic, bullet lists | Single package for all needed formatting extensions |
| `@dnd-kit/core` | ^6.x | Drag-and-drop engine | 10kB zero-dependency engine; modern; maintained |
| `@dnd-kit/sortable` | ^7.x | Sortable preset | Provides `useSortable`, `SortableContext`, `arrayMove` |
| `@dnd-kit/utilities` | ^3.x | CSS transform helper | `CSS.Transform.toString()` for smooth drag animation |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-hot-toast` or native Tailwind toast | — | Success/error toasts | After save, delete, upload operations |
| No extra form library | — | Product form | Native controlled inputs are sufficient for this form size |

**Note on Tiptap v3:** Tiptap v3 (3.x) was recently published (March 2026 per npm). API changed significantly. Use v2 (`@tiptap/react@^2`) for stability unless you confirm the team is tracking v3. The `immediatelyRender` option exists in v2; verify it exists in v3 before adopting.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Tiptap | Lexical (Meta) | Lexical has better perf but requires more custom toolbar wiring; Tiptap StarterKit is faster to implement |
| Tiptap | Quill 2 | Quill requires `dynamic(() => import(...), { ssr: false })` wrapper; same bundle size; less TypeScript-native |
| @dnd-kit | `react-beautiful-dnd` | Atlassian officially deprecated rbd in 2022; do not use |
| @dnd-kit | vanilla HTML5 drag API | Works for simple list but broken on mobile (touch events not supported natively); dnd-kit handles touch |
| Public bucket | Signed upload URLs | Signed URLs are better for sensitive content; product images are public so public bucket is correct and more performant (CDN-cached) |

**Installation:**
```bash
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── (admin)/
│   │   ├── layout.tsx               # Admin shell: sidebar + header, auth guard
│   │   ├── admin/
│   │   │   ├── page.tsx             # Dashboard (stats + recent orders)
│   │   │   ├── login/
│   │   │   │   └── page.tsx         # /admin/login (public, excluded from guard)
│   │   │   ├── products/
│   │   │   │   ├── page.tsx         # Product list
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx     # New product form
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx     # Edit product form
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx         # Order list with status tabs
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx     # Order detail view
│   │   │   ├── reviews/
│   │   │   │   └── page.tsx         # Add review form
│   │   │   └── settings/
│   │   │       └── page.tsx         # Business settings form
│   │   └── _components/             # Admin-only components
│   │       ├── AdminSidebar.tsx
│   │       ├── ProductForm.tsx      # 'use client'
│   │       ├── RichTextEditor.tsx   # 'use client' (Tiptap)
│   │       ├── ImageUploader.tsx    # 'use client' (drag-drop + upload)
│   │       └── OrderStatusSelect.tsx
│   └── api/
│       └── admin/
│           ├── products/route.ts    # Server-side CRUD (service-role client)
│           ├── orders/route.ts      # Status updates
│           └── settings/route.ts   # Key-value reads/writes
└── lib/
    └── supabase/
        └── admin.ts                 # createAdminClient() using SERVICE_ROLE_KEY
```

**Route group note:** The `(admin)` group already exists (`.gitkeep` present). All admin pages live under `/admin/...` URLs. The `(admin)` group provides the layout wrapper without affecting the URL.

### Pattern 1: Middleware Route Protection

The existing `middleware.ts` already runs `getClaims()` for session refresh. Extend it to guard `/admin` paths:

```typescript
// middleware.ts — extend existing Step 2 block
await supabase.auth.getClaims()

// ── Step 3: Admin route guard ─────────────────────────────────────────────
const isAdminPath = request.nextUrl.pathname.startsWith('/admin')
const isLoginPath = request.nextUrl.pathname === '/admin/login'

if (isAdminPath && !isLoginPath) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const loginUrl = new URL('/admin/login', request.url)
    return NextResponse.redirect(loginUrl)
  }
}

// ── Step 4: Redirect authenticated admin away from login page ─────────────
if (isLoginPath) {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }
}
```

**Key decision:** Use `getUser()` (not just `getClaims()`) for the admin guard. `getClaims()` validates the JWT signature locally but does not verify whether the session has been revoked server-side. `getUser()` makes a round-trip to Supabase Auth and is authoritative. For the admin panel — which controls all business data — this extra security is correct. The performance cost is one extra request per page navigation, acceptable for an admin-only interface.

**Security note (CVE-2025-29927):** Never rely solely on middleware for auth. Each admin Server Component and API route must independently verify auth using `supabase.auth.getUser()`.

### Pattern 2: Admin Login Server Action

```typescript
// app/(admin)/admin/login/actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function loginAction(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  if (error) return { error: error.message }
  redirect('/admin')
}
```

The login page is a `'use client'` form component that calls this server action. On error, display inline message. On success, the middleware redirect-away-from-login fires.

**Logout:** `supabase.auth.signOut()` in a server action, then `redirect('/admin/login')`.

### Pattern 3: Admin Supabase Client (Service Role)

Products, orders, and reviews need writes that bypass RLS. Create a dedicated service-role client:

```typescript
// src/lib/supabase/admin.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!  // never expose to browser
  )
}
```

Use this client ONLY in server-side code (Server Components, API routes, Server Actions). The service-role key must never reach the browser. Verify: `SUPABASE_SERVICE_ROLE_KEY` is not prefixed `NEXT_PUBLIC_`.

### Pattern 4: Tiptap Rich Text Editor

```typescript
// src/app/(admin)/_components/RichTextEditor.tsx
'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

interface Props {
  value: string          // HTML string stored in DB
  onChange: (html: string) => void
}

export function RichTextEditor({ value, onChange }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    immediatelyRender: false,  // CRITICAL: prevents SSR hydration mismatch
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })
  return <EditorContent editor={editor} />
}
```

The `description` field in the `products` table is `text`. Store HTML from Tiptap's `getHTML()` directly. The storefront renders it with `dangerouslySetInnerHTML` — this is safe because the content is admin-controlled, not user-submitted.

### Pattern 5: Supabase Storage Upload (Client-Side)

Product images go into a **public bucket** named `product-images`. Public buckets serve files over Supabase's CDN with no auth token required — correct for storefront display.

Upload flow: browser → Supabase Storage directly (no Next.js server in the path). This avoids Next.js's 1MB body limit on Server Actions.

```typescript
// Inside ImageUploader.tsx ('use client')
import { createClient } from '@/lib/supabase/client'  // browser client

async function uploadImage(file: File, productId: string): Promise<string> {
  const supabase = createClient()
  const path = `${productId}/${Date.now()}-${file.name}`

  const { error } = await supabase.storage
    .from('product-images')
    .upload(path, file, { upsert: false })

  if (error) throw error

  const { data } = supabase.storage
    .from('product-images')
    .getPublicUrl(path)

  return data.publicUrl  // store this string in products.images[]
}
```

**Bucket setup (one-time SQL/dashboard):**
- Create bucket `product-images`, set to public
- Add Storage RLS policy: allow INSERT/DELETE only for authenticated users (the admin)

### Pattern 6: dnd-kit Sortable Image Grid

```typescript
// Inside ImageUploader.tsx
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// SortableThumb component
function SortableThumb({ id, url, onRemove }: { id: string; url: string; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
         className="relative w-20 h-20 cursor-grab">
      <img src={url} className="w-full h-full object-cover rounded" />
      <button onClick={onRemove} className="absolute top-0 right-0 ...">×</button>
    </div>
  )
}

// In ImageUploader:
const [imageIds, setImageIds] = useState<string[]>([])  // ordered IDs

const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event
  if (over && active.id !== over.id) {
    setImageIds(ids => arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))))
  }
}
```

Use `rectSortingStrategy` for a grid layout. The first item in `imageIds` order maps to `products.image` (thumbnail); all items map to `products.images[]`.

### Pattern 7: Settings Table (Key-Value)

```sql
-- Migration: create settings table
create table public.settings (
  key   text primary key,
  value text not null default ''
);

-- Seed initial values
insert into public.settings (key, value) values
  ('store_name', 'Twinkle Locs'),
  ('store_tagline', 'Your locs, your crown'),
  ('address', ''),
  ('email', ''),
  ('whatsapp_number', '+2349118888010'),
  ('shipping_flat_rate', '1500'),
  ('instagram_url', ''),
  ('tiktok_url', ''),
  ('facebook_url', '');
```

Read all settings at runtime in Server Components:
```typescript
const { data: rows } = await supabase.from('settings').select('key, value')
const settings = Object.fromEntries(rows!.map(r => [r.key, r.value]))
```

**RLS for settings:** Public SELECT (storefront reads); UPDATE restricted to authenticated users only. No INSERT/DELETE from public.

### Pattern 8: Products is_active Toggle

Add `is_active boolean not null default true` to the products table. The storefront query adds `.eq('is_active', true)`. The admin shows all products including archived ones. Toggle via PATCH to the product.

The TypeScript `Product` type and `Database['public']['Tables']['products']['Row']` both need this column added.

### Anti-Patterns to Avoid

- **Calling `getSession()` for route protection:** It does not validate the JWT against Supabase's auth server. Always use `getUser()` in protection logic.
- **Routing auth check through middleware only:** Middleware can be bypassed. Each admin page must independently verify auth.
- **Uploading images through a Server Action:** Next.js limits Server Action bodies to 1MB. Upload directly from the browser to Supabase Storage.
- **Storing image data as base64 in the products table:** Use public URLs from Supabase Storage only.
- **Using a separate auth system:** The project already uses Supabase Auth. Do not add NextAuth or any other auth library.
- **Building a custom rich text editor:** HTML sanitisation, cursor management, and toolbar state are genuinely complex. Use Tiptap.
- **Using `react-beautiful-dnd`:** Officially deprecated since 2022.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rich text editing | Custom contenteditable | Tiptap + StarterKit | Cursor management, undo/redo, clipboard paste, HTML serialisation are each complex problems |
| Drag-to-reorder | HTML5 `draggable` attribute | @dnd-kit/sortable | Native drag events don't fire on mobile (touch); dnd-kit normalises pointer/touch/keyboard |
| Auth cookie management | Manual cookie reads | Supabase SSR client (already in use) | Token refresh, cookie SameSite, HttpOnly flags are already handled |
| Inline status update | Custom optimistic UI | Controlled `<select>` with server action + `router.refresh()` | Simple and correct for one admin user |

**Key insight:** The admin panel serves one user (Unoma). It does not need real-time subscriptions, optimistic UI, or complex state management. Simple server actions + `router.refresh()` after mutations is the correct pattern.

---

## Common Pitfalls

### Pitfall 1: Tiptap Hydration Mismatch
**What goes wrong:** Tiptap initialises its ProseMirror DOM on the server and client, producing a mismatch error: "Text content does not match server-rendered HTML."
**Why it happens:** Tiptap's editor creates non-deterministic DOM on first render.
**How to avoid:** Always set `immediatelyRender: false` in `useEditor()`. This defers rendering to client-only. The component still needs `'use client'`.
**Warning signs:** React hydration error in console mentioning EditorContent or ProseMirror.

### Pitfall 2: Supabase Storage 1MB Upload via Server Action
**What goes wrong:** Uploading a product image through a Next.js Server Action fails for files over 1MB.
**Why it happens:** Next.js enforces a 1MB body limit on Server Actions by default.
**How to avoid:** Upload images directly from the browser using the Supabase browser client (`createBrowserClient`). The browser sends the file directly to Supabase Storage, bypassing Next.js entirely.
**Warning signs:** 413 Payload Too Large error on image upload.

### Pitfall 3: Service Role Key Leaking to Client
**What goes wrong:** `SUPABASE_SERVICE_ROLE_KEY` appears in client-side JavaScript bundle, exposing full database access to anyone.
**Why it happens:** Accidentally importing `createAdminClient()` in a `'use client'` component or a file that Next.js bundles for the browser.
**How to avoid:** Never prefix the service role key with `NEXT_PUBLIC_`. Never import `admin.ts` from a client component. Only use it in Server Components, API routes, and Server Actions.
**Warning signs:** Key appears in browser DevTools → Network tab response headers or JS source.

### Pitfall 4: Products with variants JSONB shape inconsistency
**What goes wrong:** A new product created via the admin form has variants in a slightly different shape from existing products (e.g. missing `price_tiers`, wrong field names), breaking the storefront's `ProductDetailClient`.
**Why it happens:** The existing products have `price_tiers: PriceTier[]` per variant (established in Phase 4), but the admin form might not include this field.
**How to avoid:** The admin variant form must include `price_tiers` editing. Default a new variant to `price_tiers: [{ qty: 1, price: variantPrice }]` so single-tier products work. The existing `PriceTier` type `{ qty: number; price: number }` must be the canonical shape.
**Warning signs:** Storefront product detail page throws on `variant.price_tiers.map(...)`.

### Pitfall 5: Missing `is_active` column on existing rows
**What goes wrong:** After adding `is_active` column to products table, the storefront `.eq('is_active', true)` filter returns zero products because existing rows have `null`.
**Why it happens:** `ALTER TABLE ADD COLUMN` without a default leaves existing rows as NULL, not `true`.
**How to avoid:** Use `ALTER TABLE products ADD COLUMN is_active boolean NOT NULL DEFAULT true;` — the `DEFAULT true` backfills existing rows.

### Pitfall 6: Admin layout leaking into the marketing/shop layout
**What goes wrong:** The admin sidebar renders on storefront pages, or the storefront's CartProvider is included in admin pages.
**Why it happens:** Placing admin layout components in the root `layout.tsx` instead of the `(admin)` group layout.
**How to avoid:** All admin chrome (sidebar, header) lives exclusively in `src/app/(admin)/layout.tsx`. The root `layout.tsx` does not import any admin components.

### Pitfall 7: Supabase Storage bucket not set to public
**What goes wrong:** Product images uploaded by admin return 400/403 errors on the storefront when fetched without auth tokens.
**Why it happens:** The `product-images` bucket was created as private (default).
**How to avoid:** Create the bucket with `public: true` in the Supabase dashboard or via migration. Verify with `supabase.storage.from('product-images').getPublicUrl(path)` — it should return a URL without a token query param.

---

## Code Examples

### Supabase Admin Client (service role)
```typescript
// src/lib/supabase/admin.ts
// Source: Supabase docs — service role bypasses RLS
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}
```

### Middleware Admin Guard (extends existing)
```typescript
// middleware.ts — Step 3 addition after existing getClaims() call
const pathname = request.nextUrl.pathname
const isAdminPath = pathname.startsWith('/admin')
const isAdminLogin = pathname === '/admin/login'

if (isAdminPath && !isAdminLogin) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }
}
if (isAdminLogin) {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }
}
```

### Login Server Action
```typescript
// Source: Supabase Auth docs — signInWithPassword pattern
'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function loginAction(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  if (error) return { error: error.message }
  redirect('/admin')
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/admin/login')
}
```

### Dashboard Stats Query
```typescript
// Source: Supabase JS docs — aggregate pattern
const today = new Date(); today.setHours(0,0,0,0)
const { data: orders } = await adminClient
  .from('orders')
  .select('total, created_at, status, customer_name, id')
  .gte('created_at', startDate.toISOString())
  .order('created_at', { ascending: false })

const totalSales = orders?.reduce((sum, o) => sum + o.total, 0) ?? 0
```

### Product CRUD — Upsert with variants
```typescript
// Server Action for product save
const payload = {
  name, slug, description,  // description = HTML from Tiptap
  image: imageUrls[0] ?? '',
  images: imageUrls,
  material, is_featured, is_active,
  price_min: Math.min(...variants.map(v => v.price)),
  price_max: Math.max(...variants.map(v => v.price)),
  variants: variants,  // already typed as ProductVariant[] with price_tiers
}
await adminClient.from('products').upsert({ id: productId, ...payload })
```

### Settings Read (storefront)
```typescript
// In any Server Component that needs settings
const { data } = await supabase.from('settings').select('key, value')
const settings = Object.fromEntries((data ?? []).map(r => [r.key, r.value]))
const whatsapp = settings.whatsapp_number ?? '+2349118888010'
```

---

## Schema Changes Required

This phase requires three database changes:

### 1. Add `is_active` to products
```sql
ALTER TABLE public.products
  ADD COLUMN is_active boolean NOT NULL DEFAULT true;
```
Storefront catalog query gains: `.eq('is_active', true)`

### 2. Create `settings` table
```sql
CREATE TABLE public.settings (
  key   text PRIMARY KEY,
  value text NOT NULL DEFAULT ''
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings are publicly readable"
  ON public.settings FOR SELECT USING (true);

CREATE POLICY "Only authenticated users can update settings"
  ON public.settings FOR UPDATE USING (auth.role() = 'authenticated');
```

### 3. Create `product-images` Supabase Storage bucket
- Create via dashboard: Storage → New bucket → name: `product-images` → Public: ON
- Add RLS storage policy: authenticated users can INSERT and DELETE; public can SELECT

### 4. TypeScript type additions (supabase.ts)
- Add `is_active: boolean` to `products.Row` and `products.Insert`
- Add `settings` table type
- Export `Setting` convenience type

---

## Plan Boundaries

The natural breakdown for this phase is seven plans:

| Plan | Name | Scope |
|------|------|-------|
| 06-01 | Foundation & Auth | Schema migrations, admin client, middleware guard, login/logout pages, admin layout shell |
| 06-02 | Dashboard | Stats panel (today/week/month tabs), recent orders table, Server Component data fetching |
| 06-03 | Product List | Product list page with search, category filter, active/archived toggle |
| 06-04 | Product Form — Core | Create/edit form: name, description (Tiptap), price, is_active toggle, variants inline table |
| 06-05 | Product Form — Images | ImageUploader component: drag-drop zone, Supabase Storage upload, dnd-kit reorder thumbnails |
| 06-06 | Orders | Order list with status filter tabs, inline status dropdown, order detail view |
| 06-07 | Reviews & Settings | Add review form (product picker + fields), settings form with immediate storefront effect |

**Plan 06-01 is the blocker:** all other plans depend on auth, layout, and the admin Supabase client being in place. Plans 06-02 through 06-07 can be written and executed sequentially after it.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| `getSession()` for auth guard | `getUser()` for protection logic, `getClaims()` for session refresh | Security — `getSession()` doesn't validate against auth server |
| `react-beautiful-dnd` | `@dnd-kit/sortable` | Deprecated in 2022; dnd-kit is maintained |
| Quill 1.x | Tiptap 2.x or Quill 2.x | Both TypeScript-native; Tiptap has better Next.js integration docs |
| Uploading via Server Action | Direct browser upload to Supabase Storage | Avoids Next.js 1MB body limit |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Replaced by `@supabase/ssr` (already using the new package)
- `supabase.auth.getSession()` for protection: Use `getUser()` instead
- `react-beautiful-dnd`: Deprecated 2022

---

## Open Questions

1. **Tiptap v2 vs v3**
   - What we know: v3 (3.x) published March 2026; API changed significantly from v2
   - What's unclear: Whether `immediatelyRender: false` exists in v3; whether StarterKit package name is the same
   - Recommendation: Pin to `@tiptap/react@^2` and `@tiptap/starter-kit@^2` for Phase 6. Upgrade can be a separate task.

2. **Supabase Storage bucket creation**
   - What we know: Bucket needs to be created before upload code runs
   - What's unclear: Whether the project already has a `product-images` bucket from earlier testing
   - Recommendation: Plan 06-01 should include a verification step: check Storage in Supabase dashboard, create if absent.

3. **Admin user creation**
   - What we know: No Supabase Auth user exists yet for Unoma
   - What's unclear: Whether to create the user via SQL, dashboard, or a one-time script
   - Recommendation: Plan 06-01 includes an explicit step to create the admin user via Supabase Dashboard → Authentication → Users → "Add user". Do not expose a public signup route.

4. **`images` column existence in live DB**
   - What we know: `images: string[]` exists in the TypeScript type (added in Phase 4)
   - What's unclear: Whether the `images` column was actually added to the live Supabase table, or only the TypeScript type was updated
   - Recommendation: Plan 06-01 verification includes checking the live schema. If missing: `ALTER TABLE products ADD COLUMN images text[] NOT NULL DEFAULT '{}'`.

---

## Sources

### Primary (HIGH confidence)
- `@supabase/ssr` official docs — `getClaims()` vs `getUser()` guidance, middleware pattern, `signInWithPassword`
- Supabase Storage official docs — public vs private buckets, `storage.from().upload()`, `getPublicUrl()`
- `@dnd-kit/sortable` official docs (dndkit.com) — `useSortable`, `arrayMove`, `rectSortingStrategy` code example
- `@tiptap/react` official docs (tiptap.dev) — Next.js install, `immediatelyRender: false`, StarterKit

### Secondary (MEDIUM confidence)
- GitHub discussion supabase/discussions#21468 — route protection pattern with `getUser()` check
- WebSearch: CVE-2025-29927 — middleware-only auth bypass; verified by official Supabase docs warning

### Tertiary (LOW confidence)
- WebSearch: Tiptap v3 existence (version 3.x on npm) — version capabilities unverified against official docs; treat as flag to investigate

---

## Metadata

**Confidence breakdown:**
- Auth patterns (middleware, login action, service role): HIGH — verified against official Supabase docs
- Tiptap integration (`immediatelyRender: false`, SSR safety): HIGH for v2; LOW for v3
- dnd-kit sortable pattern: HIGH — verified against official dndkit.com docs
- Supabase Storage public bucket + getPublicUrl: HIGH — verified against official docs
- Settings key-value table pattern: HIGH — standard Supabase/Postgres pattern, no novel library
- Schema changes needed: HIGH — inferred from existing schema.sql and TypeScript types

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (Supabase API stable; dnd-kit stable; Tiptap v3 situation may resolve sooner)
