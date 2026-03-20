# Phase 3: Product Catalog - Research

**Researched:** 2026-03-20
**Domain:** Next.js 15 App Router catalog page — client-side filtering, Supabase schema design, mock-to-real swap
**Confidence:** HIGH (codebase verified directly; external patterns cross-checked with official docs)

---

## Summary

Phase 3 builds `/catalog` as a Server Component page that fetches all products once, then passes the full dataset to a single `'use client'` island (`CatalogClient`) which handles filter, sort, and search state entirely in memory. This approach was chosen because the catalog has only 6 products — server round-trips per filter interaction would be wasteful, and the instant-update requirement makes URL-param-driven server re-renders a poor fit.

The existing codebase already establishes the exact patterns needed: `page.tsx` owns data and passes typed props (see `FeaturedProductsSection`), `MobileDrawer` is a reusable slide-in panel already wired, and `ProductCard` exists but needs augmentation (category badge, stock indicator, card-click navigation replacing the `onAddToCart` button).

The mock-to-Supabase swap is a one-liner: replace the mock array import in `page.tsx` with an async Supabase query. The `Product` type that replaces `MockProduct` must be defined first so both the mock data and the real query satisfy the same interface.

**Primary recommendation:** Fetch all products server-side once. Filter/sort/search entirely client-side via `useState` inside a single `CatalogClient` island. No URL params needed for this catalog scale.

---

## Architecture Decision

### Client-Side Filtering vs URL-Based Filtering

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| Client-side state (`useState`) | Instant updates, no network, simple | State lost on page refresh | **Use this** |
| URL search params (`useSearchParams` + server re-render) | Shareable URLs, SEO | Server re-render per filter change, Suspense boundary required around `useSearchParams` | Not needed for 6 products |
| URL params via `window.history.pushState` (shallow) | Shareable URLs without server re-render | Adds complexity (nuqs or manual), not required by spec | Deferred to future phase |

**Decision: Client-side `useState` filtering.**

Reasons:
1. Spec says "results update without a full page reload" and "live as-you-type" — both are pure client requirements.
2. 6 products fit in memory trivially. No pagination. No lazy loading.
3. Keeping `page.tsx` as a Server Component is preserved — the entire data set is fetched once at render, then passed as a prop.
4. `useSearchParams()` in Next.js 15 requires a `<Suspense>` boundary or it throws a build error. Avoiding it keeps the component tree simpler.

**Confidence: HIGH** — Verified against Next.js 15 docs behavior and the existing `FeaturedProductsSection` pattern in the codebase.

---

## Supabase Schema

### Products Table SQL

```sql
-- Run in Supabase SQL Editor (Dashboard > SQL Editor)

create table public.products (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  description   text not null default '',
  image         text not null default '/images/products/placeholder-bead.svg',
  material      text not null,             -- 'Gold' | 'Silver' | 'Crystal' | 'Tools'
  is_featured   boolean not null default false,
  price_min     integer not null,          -- paise/kobo in ₦, stored as integer (no decimals needed)
  price_max     integer not null,
  variants      jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);

-- Enable RLS (read-only public access for catalog)
alter table public.products enable row level security;

create policy "Products are publicly readable"
  on public.products
  for select
  using (true);
```

**Notes on column choices:**
- `material` is `text` not an enum — allows dashboard entry without migration for new categories
- `variants` is `jsonb` — matches the `MockProductVariant[]` shape, avoids a join table for 3-4 variants per product
- `price_min` / `price_max` stored as integer Naira (no decimals in Nigerian pricing for this product range)
- `created_at` drives the "Latest" sort option
- WooCommerce ID explicitly omitted (per CONTEXT.md)

### Variants JSONB Shape

```json
[
  { "id": "var_001a", "name": "Small (4mm)", "price": 2500, "in_stock": true },
  { "id": "var_001b", "name": "Medium (6mm)", "price": 3200, "in_stock": true },
  { "id": "var_001c", "name": "Large (8mm)", "price": 4000, "in_stock": false }
]
```

### Seed Data (6 Products — Manual Dashboard Entry)

| name | slug | material | is_featured | price_min | price_max | variants (count) |
|------|------|----------|-------------|-----------|-----------|-----------------|
| 24K Gold Beads | 24k-gold-beads | Gold | true | 2500 | 4000 | 3 |
| Gold Beads | gold-beads | Gold | true | 1800 | 3000 | 3 |
| Silver Beads | silver-beads | Silver | true | 1800 | 3000 | 3 |
| Onyx Beads | onyx-beads | Crystal | true | 2000 | 3200 | 3 |
| Crystal Clear Beads | crystal-clear-beads | Crystal | false | 1600 | 2800 | 3 |
| Shears | shears | Tools | false | 3500 | 3500 | 1 |

**Note:** Crystal Clear Beads and Shears are not in the current mock data — they must be added to `src/lib/mock/products.ts` when the full catalog is built.

### TypeScript Type (replaces MockProduct)

```typescript
// src/lib/types/product.ts  — new file, canonical type for Phase 3+
export interface ProductVariant {
  id: string
  name: string
  price: number
  in_stock: boolean
}

export type ProductMaterial = 'Gold' | 'Silver' | 'Crystal' | 'Tools'

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  image: string
  material: ProductMaterial
  is_featured: boolean
  variants: ProductVariant[]
  price_min: number
  price_max: number
  created_at: string   // ISO string from Supabase; omit from mock if preferred
}
```

`MockProduct` in `src/lib/mock/products.ts` should be replaced with `Product` (or aliased: `export type MockProduct = Product`). The existing mock data already satisfies this shape except for `material` and `created_at`.

---

## Component Architecture

```
src/app/catalog/
├── page.tsx                    # Server Component — fetches products, renders CatalogClient
└── [slug]/
    └── page.tsx                # Phase 4 — stub only in Phase 3

src/components/catalog/
├── CatalogClient.tsx           # 'use client' island — owns filter/sort/search state
├── CatalogProductCard.tsx      # Server-renderable (no handlers) — link wrapper replaces button
├── FilterBar.tsx               # 'use client' — category chips + sort dropdown (desktop)
├── FilterDrawer.tsx            # 'use client' — slide-in mobile filter (wraps MobileDrawer)
└── SearchInput.tsx             # 'use client' — controlled text input

src/lib/mock/
└── products.ts                 # Extended: add Crystal Clear Beads + Shears, material field
```

### Component Responsibility Map

| Component | Rendered By | 'use client'? | Responsibility |
|-----------|-------------|---------------|----------------|
| `catalog/page.tsx` | Next.js (Server) | No | Fetch products, pass to CatalogClient |
| `CatalogClient` | page.tsx | Yes | Holds filter/sort/search state, computes `filteredProducts`, renders grid |
| `CatalogProductCard` | CatalogClient | No (pure) | Display card with Link to /catalog/[slug], no click handler needed |
| `FilterBar` | CatalogClient | Yes | Renders category chips + sort dropdown, calls callbacks up |
| `FilterDrawer` | CatalogClient | Yes | Mobile filter UI using existing MobileDrawer |
| `SearchInput` | CatalogClient | Yes | Controlled input, debounce optional |

**Key decision:** `CatalogProductCard` does NOT need `'use client'` because clicking a card navigates via `<Link href>` — there is no `onClick` handler. This contrasts with `ProductCard` on the homepage which fires `onAddToCart`. Build a separate component rather than modifying the existing one.

### Data Flow

```
page.tsx (Server)
  └── fetches: products: Product[]
  └── renders: <CatalogClient products={products} />

CatalogClient (Client island)
  ├── state: activeCategory, sortOrder, searchQuery
  ├── derived: filteredProducts = useMemo(filter + sort logic, [products, state])
  ├── renders: <SearchInput /> + <FilterBar /> (desktop) + <FilterDrawer /> (mobile)
  └── renders: product grid from filteredProducts
```

---

## Filter/Search Implementation

### State Shape

```typescript
// Inside CatalogClient.tsx
type SortOrder = 'price_asc' | 'price_desc' | 'latest'
type Category = 'All' | 'Gold' | 'Silver' | 'Crystal' | 'Tools'

const [activeCategory, setActiveCategory] = useState<Category>('All')
const [sortOrder, setSortOrder] = useState<SortOrder>('latest')
const [searchQuery, setSearchQuery] = useState('')
```

### Filtering Logic (useMemo)

```typescript
const filteredProducts = useMemo(() => {
  let result = [...products]

  // Search takes priority — resets category filter
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase()
    result = result.filter(p => p.name.toLowerCase().includes(q))
    // Do NOT apply activeCategory when search is active
  } else if (activeCategory !== 'All') {
    result = result.filter(p => p.material === activeCategory)
  }

  // Sort
  if (sortOrder === 'price_asc') result.sort((a, b) => a.price_min - b.price_min)
  if (sortOrder === 'price_desc') result.sort((a, b) => b.price_min - a.price_min)
  if (sortOrder === 'latest') result.sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return result
}, [products, activeCategory, sortOrder, searchQuery])
```

**Search resets categories:** When `searchQuery` is non-empty, category filter is bypassed (per CONTEXT.md spec). The category chips can visually appear deselected when search is active.

### Empty State

When `filteredProducts.length === 0` AND `searchQuery` is non-empty:

```tsx
<p className="font-body text-charcoal/60 text-center py-12">
  No products match &ldquo;{searchQuery}&rdquo; — showing all products
</p>
{/* Then render ALL products below the message */}
```

Per CONTEXT.md: "show all products with message" on empty search — do not show zero results.

### Mobile Filter Drawer

Reuse `MobileDrawer` from `src/components/layout/MobileDrawer.tsx` directly. It already handles:
- Backdrop with `bg-cocoa/60`
- Escape key close
- Body scroll lock
- Slide-in animation (`translate-x-0` / `-translate-x-full`)

`FilterDrawer` wraps `MobileDrawer`, passing the filter chip content as `children`. The trigger "Filter" button lives in `CatalogClient`.

---

## Mock-to-Supabase Swap Plan

### Step 1: Build with mock (Phase 3, first)

`src/app/catalog/page.tsx`:

```typescript
import { CATALOG_PRODUCTS } from '@/lib/mock/products'
import { CatalogClient } from '@/components/catalog/CatalogClient'

export default function CatalogPage() {
  return <CatalogClient products={CATALOG_PRODUCTS} />
}
```

### Step 2: Swap at end of Phase 3 (one line)

```typescript
// BEFORE (mock):
import { CATALOG_PRODUCTS } from '@/lib/mock/products'

// AFTER (Supabase — one line swap):
import { createClient } from '@/lib/supabase/server'

export default async function CatalogPage() {
  const supabase = await createClient()
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  return <CatalogClient products={products ?? []} />
}
```

**Why this works cleanly:**
- `Product` type matches Supabase row shape exactly
- `CatalogClient` props type is `Product[]` — unchanged
- `page.tsx` becomes `async` — no other changes needed
- Supabase server client already exists at `src/lib/supabase/server.ts`

### Supabase Type Generation (after table is created)

```bash
npx supabase gen types typescript \
  --project-id "$SUPABASE_PROJECT_REF" \
  --schema public \
  > src/types/supabase.ts
```

Then `Database['public']['Tables']['products']['Row']` can replace the manual `Product` interface, or keep the manual interface and assert it satisfies the generated type.

---

## Existing Patterns to Follow

### From Phase 2 codebase — reuse directly

| Pattern | Source File | How to Reuse |
|---------|-------------|--------------|
| Props-down data flow | `src/app/page.tsx` + `FeaturedProductsSection` | `catalog/page.tsx` passes `products` array as prop to `CatalogClient` |
| `MobileDrawer` component | `src/components/layout/MobileDrawer.tsx` | Import directly into `FilterDrawer` as children wrapper |
| Theme tokens | `src/app/globals.css` | Use `bg-gold`, `text-cocoa`, `bg-cream`, `text-terracotta` etc — no new colours needed |
| Font classes | Established in layout | `font-display`, `font-heading`, `font-body` |
| Card hover pattern | `ProductCard.tsx` | `hover:-translate-y-1 hover:shadow-lg transition-all duration-200` |
| Backdrop pattern | `MobileDrawer.tsx` + `AddToCartModal.tsx` | `bg-cocoa/60` for overlays |
| Gradient syntax | `globals.css` pattern | `bg-linear-to-br` (Tailwind v4), not `bg-gradient-to-br` |
| `'use client'` island placement | `FeaturedProductsSection.tsx` | Mark only leaf islands; `page.tsx` stays Server Component |

### Tailwind v4 Reminders (from existing globals.css)

- Colour tokens defined in `@theme {}` block — use as `bg-gold`, `text-cocoa`, etc.
- No `tailwind.config.js` — all config is in `globals.css`
- Gradient: `bg-linear-to-br` not `bg-gradient-to-br`
- The `stone` colour is `#F5F0E8` (not Tailwind's default stone) — product card backgrounds

### Category Badge Pattern

Category badges are new to Phase 3. Suggested approach (Claude's discretion per CONTEXT.md):

```tsx
const MATERIAL_COLOURS: Record<ProductMaterial, string> = {
  Gold:    'bg-gold/20 text-cocoa',
  Silver:  'bg-stone text-charcoal',
  Crystal: 'bg-forest/10 text-forest',
  Tools:   'bg-terracotta/10 text-terracotta',
}
```

### Stock Status Indicator

`is_featured` is already on the type. Stock status derives from variants:

```typescript
const hasAnyStock = (product: Product) =>
  product.variants.some(v => v.in_stock)
```

Display: small dot or badge — "In Stock" (forest green) / "Low Stock" (gold) / "Out of Stock" (terracotta/muted).

---

## Pitfalls to Avoid

### Pitfall 1: `useSearchParams()` Without Suspense Boundary

**What goes wrong:** Next.js 15 throws a build/runtime error if `useSearchParams()` is called in a Client Component that is not wrapped in `<Suspense>`. This is a breaking change from Next.js 13/14.

**Why it happens:** Next.js 15 requires Suspense boundaries for any component that reads dynamic request data on the client.

**How to avoid:** We are NOT using `useSearchParams()` — all filter state is local `useState`. Do not introduce `useSearchParams` for Phase 3.

**Warning signs:** Build error mentioning "Missing Suspense boundary" or "useSearchParams() should be wrapped in a suspense boundary."

### Pitfall 2: Marking CatalogProductCard as 'use client' Unnecessarily

**What goes wrong:** If `CatalogProductCard` is marked `'use client'`, it loses the ability to be server-rendered and adds bundle weight.

**How to avoid:** The catalog card uses `<Link href={/catalog/${product.slug}}>` for navigation — no event handlers. Keep it as a pure component with no `'use client'` directive.

### Pitfall 3: Modifying Existing `ProductCard` Component

**What goes wrong:** The homepage `ProductCard` has `onAddToCart` callback. If modified for catalog use (adding Link, removing button), the homepage breaks.

**How to avoid:** Create `CatalogProductCard` as a new component in `src/components/catalog/`. The catalog card has a different contract (navigation vs modal trigger).

### Pitfall 4: `created_at` Missing from Mock Data

**What goes wrong:** The "Latest" sort uses `created_at`. Mock products don't have this field, so sorting by "Latest" produces `NaN` comparisons.

**How to avoid:** Add `created_at` to `Product` type and mock data, or special-case "Latest" in mock mode to return mock array order (which IS already in logical creation order).

Simplest fix in mock: assign static ISO strings to each product.

### Pitfall 5: Supabase JSONB Variants Not Typed

**What goes wrong:** After `supabase gen types typescript`, the `variants` column comes back as `Json` (Supabase's generic type), not `ProductVariant[]`. TypeScript will complain when accessing `variant.in_stock`.

**How to avoid:** Cast the result after fetching:

```typescript
const products = (data ?? []).map(row => ({
  ...row,
  variants: row.variants as ProductVariant[],
}))
```

Or define the `Product` type manually (not from generated types) and assert: `data as Product[]`.

### Pitfall 6: Empty Products Array on Supabase Error

**What goes wrong:** If the Supabase query fails (e.g., during development before table exists), `data` is `null` and spreading causes a crash.

**How to avoid:** Always use `products ?? []` as the fallback. The mock-first build sequence means this only becomes relevant at the swap step.

### Pitfall 7: Filter Drawer z-index Conflict with Header

**What goes wrong:** The site `Header` uses `z-30`. The existing `MobileDrawer` uses `z-50` for the panel and `z-40` for the backdrop — these are already above the header. No change needed, but do NOT lower these values for the filter drawer.

---

## Open Questions

1. **`created_at` in mock for "Latest" sort**
   - What we know: Mock products have no `created_at` field
   - What's unclear: Whether "Latest" sort needs to work accurately during mock phase
   - Recommendation: Add static ISO date strings to mock products in logical order (24K Gold newest, Shears oldest)

2. **Crystal Clear Beads and Shears variants**
   - What we know: Not in current `FEATURED_PRODUCTS` mock data; their variant/pricing data is unknown
   - What's unclear: Exact sizes and prices for Crystal Clear Beads (3 sizes like beads?) and Shears (single item?)
   - Recommendation: Treat Shears as single variant (one price, no size). Crystal Clear Beads: same 4mm/6mm/8mm pattern as other beads.

3. **Stock status display rule**
   - What we know: variants have `in_stock` boolean per size
   - What's unclear: What constitutes "Low Stock" vs "Out of Stock" at the product level
   - Recommendation: "In Stock" if any variant is in stock; "Out of Stock" if all variants are out of stock. No "Low Stock" state needed at catalog level (single boolean per variant, no quantity data).

---

## Sources

### Primary (HIGH confidence)
- Codebase read directly: `src/lib/mock/products.ts`, `src/lib/supabase/server.ts`, `src/app/page.tsx`, `src/components/layout/MobileDrawer.tsx`, `src/components/home/FeaturedProductsSection.tsx`, `src/app/globals.css`
- Pattern verified: props-down flow, existing MobileDrawer API, Tailwind v4 theme tokens

### Secondary (MEDIUM confidence)
- [Next.js — useSearchParams docs](https://nextjs.org/docs/app/api-reference/functions/use-search-params) — Suspense boundary requirement confirmed
- [Next.js Discussion — server fetch + client filter](https://nextjs-forum.com/post/1447711553053921411) — "server fetch once, filter client-side" pattern confirmed
- [Supabase — Managing JSON and unstructured data](https://supabase.com/docs/guides/database/json) — JSONB for variants confirmed

### Tertiary (LOW confidence)
- WebSearch result re: `nuqs` for URL state — not needed for Phase 3, noted for future

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries needed; all existing dependencies sufficient
- Architecture: HIGH — verified against existing codebase patterns
- Supabase schema: HIGH — straightforward, verified JSONB support
- Filter/search logic: HIGH — standard `useMemo` + `useState` pattern
- Pitfalls: HIGH — verified against Next.js 15 specific behaviors

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (stable ecosystem; Next.js 15 + Supabase SSR APIs unlikely to change)

---

## RESEARCH COMPLETE
