# Phase 4: Product Detail - Research

**Researched:** 2026-03-21
**Domain:** Next.js 15 App Router product detail page — image gallery, variant picker, reviews display, upsell block
**Confidence:** HIGH (codebase read directly; patterns verified from existing components)

---

## Summary

Phase 4 builds out `/catalog/[slug]/page.tsx` from a placeholder stub into a full product detail page. The stub already exists and correctly uses the Next.js 15 async params pattern (`params: Promise<{ slug: string }>`). All data flows through Supabase (products table established in Phase 3 Plan 04).

The primary challenge in this phase is threefold: (1) building an image gallery with only placeholder SVGs available (real images come when the admin panel is built in a later phase); (2) creating an inline variant picker that replaces the AddToCartModal interaction pattern from Phase 2; and (3) displaying mock reviews with a Supabase table stub that Phase 6 can populate.

The existing codebase provides strong reusable primitives: `AddToCartModal` has all the variant selection logic needed (size picker, out-of-stock state, selected highlighting), `MobileDrawer` provides the drawer shell, and the brand token system (gold, cocoa, cream, terracotta, forest) is fully established.

**Primary recommendation:** Keep the product detail page as a Server Component that fetches from Supabase, with a single `'use client'` island (`ProductDetailClient`) that handles variant selection state and the Add to Cart button. Reviews and upsell block can be Server Components since they have no interactivity.

---

## Section 1: Current Codebase Inventory

### What the stub page contains

`src/app/catalog/[slug]/page.tsx` (lines 1–28) is a minimal async Server Component:
- Correctly awaits `params` per Next.js 15 dynamic route contract
- Renders a centered placeholder div with the slug and a "back to catalog" link
- No data fetching, no imports beyond types

### Product type available

`src/lib/types/product.ts` defines:
```typescript
interface ProductVariant { id, name, price, in_stock }
type ProductMaterial = 'Gold' | 'Silver' | 'Crystal' | 'Tools'
interface Product { id, name, slug, description, image, material, is_featured, variants, price_min, price_max, created_at }
```

**Gap:** The Product type has only a single `image` string. A gallery needs multiple images. The type must be extended with an `images` field (array) for Phase 4. The existing `image` field should remain as the primary/thumbnail for backward compatibility with CatalogProductCard.

### Mock data available

6 products in `src/lib/mock/products.ts` — all use the same placeholder SVG `/images/products/placeholder-bead.svg`. There are no multiple images per product yet. The gallery in Phase 4 will need to handle a single-image case gracefully.

### Existing components that can be reused

| Component | Location | Reuse Value |
|-----------|----------|-------------|
| `AddToCartModal` | `src/components/home/AddToCartModal.tsx` | Variant picker UI, out-of-stock button states, selected highlight pattern — directly copy/adapt |
| `MobileDrawer` | `src/components/layout/MobileDrawer.tsx` | Drawer shell (body-scroll lock, Escape, backdrop) |
| `CatalogProductCard` | `src/components/catalog/CatalogProductCard.tsx` | Upsell card — can be reused directly in the "You might also like" block |
| `TestimonialsSection` | `src/components/home/TestimonialsSection.tsx` | Review display pattern (name + quote card layout) |

### Established patterns to follow

- **Tailwind v4**: `bg-linear-to-br` not `bg-gradient-to-br`; no `tailwind.config.js`; tokens via `@theme` in `globals.css`
- **Token palette**: gold `#C9A84C`, cocoa `#3B1F0E`, cream `#FAF3E0`, forest `#2D5016`, terracotta `#C1440E`, charcoal `#1A1A1A`, stone `#F5F0E8`
- **Font classes**: `font-display` (Halimun), `font-heading` (Raleway), `font-body` (Inter)
- **Server Component default**: Mark `'use client'` only where interactivity is required
- **Props-down**: page.tsx fetches from Supabase, passes typed props to client islands
- **Next.js Image**: `dangerouslyAllowSVG: true` already set; Supabase Storage remote patterns already configured in `next.config.ts`

---

## Section 2: Key Implementation Decisions

### Decision 1: Inline variant picker vs modal

**Recommendation: Inline, not modal.**

On a dedicated product detail page there is no reason to hide variant selection behind a modal — the visitor is already committed to viewing this product. An inline picker is standard e-commerce practice (Amazon, Shopify, etc.) and is superior on mobile where modals cause layout shift.

The existing `AddToCartModal` is appropriate for the homepage featured products (quick add without leaving the page) but is the wrong pattern for a detail page.

**Verdict:** Build an `InlineVariantPicker` component inside the detail page client island. The logic (selected state, out-of-stock disabled, price update) can be directly adapted from `AddToCartModal`.

### Decision 2: Image gallery approach

**Recommendation: Simple thumbnail rail, no external library.**

The product currently has only one image (placeholder SVG). Real images will not exist until the admin panel is built (later phase). The gallery should be built to support multiple images but degrade gracefully to a single image.

A simple thumbnail rail approach:
- Main image area: large `next/image` fill container
- Thumbnail row below: small clickable previews (client state to track selected index)
- No swipe library needed — the mobile majority can tap thumbnails; swipe is a nice-to-have that can be added when real images exist

**Do not use**: Swiper.js, Embla, Keen Slider, or any carousel library in Phase 4. The complexity is not warranted with one placeholder image. If the owner later adds multiple images per product, a carousel can be introduced.

**Verdict:** Build a `ProductImageGallery` client component with `useState` for selected index and a thumbnail rail. Works with 1 or N images.

### Decision 3: Reviews data approach

**Recommendation: Mock reviews in Phase 4 with a Supabase reviews table stub.**

Requirements say reviews are "admin-entered" and CONV-03 (admin review management) is in Phase 6. In Phase 4:
- Create the `reviews` Supabase table (DDL + RLS) as part of this phase's schema work
- Seed 2–3 mock reviews for the existing products
- The detail page reads from Supabase (via the server component) — not from a mock file
- Phase 6 will add the admin UI to manage reviews; the table is already there

This avoids a mock-to-Supabase swap later and gives the reviews display meaningful data to render against.

**Verdict:** Create `reviews` table in Supabase during Phase 4. Seed manually. Display from Supabase on the detail page.

### Decision 4: Upsell / starter kit approach

**Recommendation: Static upsell block for bead products, hidden for non-bead products.**

The "starter kit" upsell (CONV-02) is: when viewing a bead product, show a prompt to also buy Shears. The data already exists — `Shears` is `prod_006` in the catalog with `material: 'Tools'`.

The upsell logic is simple:
- If `product.material !== 'Tools'` → show upsell block featuring the Shears product
- If `product.material === 'Tools'` → hide upsell (no self-upsell)

The Shears product can be fetched as a second Supabase query in the page's Server Component (fetch by `slug: 'shears'`), or it can be fetched via a simple client-side import from mock data until Supabase is live.

**Verdict:** Fetch Shears product alongside the main product in the Server Component (two Supabase queries). Pass to a `UpsellBlock` Server Component. No interactivity needed in the upsell block — it links to `/catalog/shears`.

### Decision 5: Thread colour variant handling

The current `ProductVariant` type only has `{ id, name, price, in_stock }`. The `name` field encodes size ("Small (4mm)"). Thread colour and quantity are mentioned in requirements (PROD-04) but do NOT exist in the current data model.

Looking at the existing mock data, all variants are size-only. The PROJECT.md describes the catalog as "variants for size (2mm/4mm/6mm), quantity (25–200), and thread colour (5 options)" but the current type does not support this.

**Recommendation:** Do not redesign the variant type in Phase 4. The current variants represent size. Quantity can be a simple number input (1–99). Thread colour is a separate dimension that requires adding a `thread_colour` field or a separate variants dimension — this is a schema decision best deferred to Phase 5 (Cart) when the cart needs to know what was selected.

For Phase 4: show size picker (from variants), quantity input (simple 1–99 stepper), and thread colour as a placeholder ("Coming soon" or a set of static colour swatches that don't affect price yet). Flag this clearly as a TODO for Phase 5.

---

## Section 3: Component Breakdown Recommendation

### File structure

```
src/app/catalog/[slug]/
└── page.tsx                    # Async Server Component — fetches product + reviews + upsell product

src/components/product/         # New directory for product detail components
├── ProductImageGallery.tsx     # 'use client' — thumbnail rail + selected image state
├── ProductDetailClient.tsx     # 'use client' — variant picker state + Add to Cart
├── ProductReviews.tsx          # Server Component (no interactivity) — renders review list
└── UpsellBlock.tsx             # Server Component — static upsell card using CatalogProductCard

src/lib/mock/reviews.ts         # Temporary: seed-quality mock reviews for development only
```

### Component responsibility map

| Component | Rendered By | use client? | Responsibility |
|-----------|-------------|-------------|----------------|
| `catalog/[slug]/page.tsx` | Next.js (Server) | No | Fetch product by slug, fetch reviews for product, fetch shears for upsell; 404 if not found |
| `ProductImageGallery` | page.tsx → ProductDetailClient | Yes | Track selected image index; render main image + thumbnail rail |
| `ProductDetailClient` | page.tsx | Yes | Hold selected variant + quantity state; render inline size picker, quantity stepper, Add to Cart button (Phase 5 no-op) |
| `ProductReviews` | page.tsx | No | Render review list — pure display, no state |
| `UpsellBlock` | page.tsx | No | Render the "starter kit" prompt with CatalogProductCard for shears |

### Data flow

```
page.tsx (Server Component)
  ├── supabase.from('products').select('*').eq('slug', slug).single()
  ├── supabase.from('reviews').select('*').eq('product_id', product.id)
  ├── supabase.from('products').select('*').eq('slug', 'shears').single()  [only if product != shears]
  │
  ├── → <ProductDetailClient product={product} />   [client island, owns variant + qty state]
  │      └── <ProductImageGallery images={product.images ?? [product.image]} />
  ├── → <ProductReviews reviews={reviews} />
  └── → <UpsellBlock shears={shearsProduct} />      [only if product.material !== 'Tools']
```

---

## Section 4: Data Model Needs

### Product type extension

The `Product` interface in `src/lib/types/product.ts` needs an `images` field:

```typescript
export interface Product {
  // ... existing fields ...
  image: string           // keep — used by CatalogProductCard as thumbnail
  images?: string[]       // new — full gallery; if absent, gallery uses [image]
}
```

The Supabase products table needs a corresponding column:

```sql
alter table public.products
  add column if not exists images text[] not null default '{}';
```

If `images` is empty array, the gallery falls back to `image`. This is backward-compatible.

### Reviews table

```sql
create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  author_name text not null,
  body        text not null,
  rating      integer not null check (rating between 1 and 5),
  created_at  timestamptz not null default now()
);

alter table public.reviews enable row level security;

create policy "Reviews are publicly readable"
  on public.reviews
  for select
  using (true);

-- Admin insert policy (for Phase 6 admin panel)
-- For now: insert via Supabase Dashboard SQL editor only
create policy "Service role can insert reviews"
  on public.reviews
  for insert
  using (true);
```

### Review TypeScript type

Create in `src/lib/types/review.ts`:

```typescript
export interface Review {
  id: string
  product_id: string
  author_name: string
  body: string
  rating: number         // 1–5
  created_at: string
}
```

### Seed reviews (3 reviews for 24K Gold Beads)

Manual SQL inserts for 3 reviews against `prod_001` (once the Supabase products table has real UUIDs, use those):

```sql
insert into public.reviews (product_id, author_name, body, rating)
select id, 'Adaeze O.', 'These are absolutely stunning — got so many compliments at my cousin''s wedding.', 5
from public.products where slug = '24k-gold-beads';

insert into public.reviews (product_id, author_name, body, rating)
select id, 'Funmi A.', 'Fast delivery and beautiful packaging. The 4mm size is perfect for thin locs.', 5
from public.products where slug = '24k-gold-beads';

insert into public.reviews (product_id, author_name, body, rating)
select id, 'Chiamaka B.', 'Good quality but the Large size was out of stock — hoping it comes back soon.', 4
from public.products where slug = '24k-gold-beads';
```

---

## Section 5: Plan Breakdown Recommendation

**4 plans** — keeping each plan focused and independently deployable.

### Plan 04-01: Type extensions + data layer
**What:** Extend Product type with `images?: string[]`; create Review type; add `images` column to Supabase products table; create and seed `reviews` table; update `src/types/supabase.ts`
**Why separate:** Schema changes must land before UI can be built against real data
**Files:** `src/lib/types/product.ts`, `src/lib/types/review.ts`, `src/lib/supabase/schema-phase4.sql`, `src/types/supabase.ts`
**Human gate:** Run schema SQL in Supabase, seed reviews

### Plan 04-02: Product detail page — layout + image gallery
**What:** Replace stub with full page layout; build `ProductImageGallery`; wire breadcrumb, product name, description, price, material badge
**Why separate:** Static/server rendering concerns only; no variant state yet
**Files:** `src/app/catalog/[slug]/page.tsx`, `src/components/product/ProductImageGallery.tsx`
**Note:** Page fetches product by slug; shows 404 (notFound()) if not found

### Plan 04-03: Variant picker + Add to Cart
**What:** Build `ProductDetailClient` with inline size picker (adapted from AddToCartModal logic), quantity stepper, thread colour placeholder, Add to Cart button (Phase 5 no-op)
**Why separate:** Client interactivity; most complex component in this phase
**Files:** `src/components/product/ProductDetailClient.tsx`
**Note:** Selected variant drives price display update; out-of-stock state disables size button

### Plan 04-04: Reviews display + upsell block
**What:** Build `ProductReviews` (renders review list from Supabase); build `UpsellBlock` (renders CatalogProductCard for shears, shown only on non-Tools products); wire both into the page
**Why separate:** Independent concerns; both are Server Components with no state
**Files:** `src/components/product/ProductReviews.tsx`, `src/components/product/UpsellBlock.tsx`, update `src/app/catalog/[slug]/page.tsx`

---

## Section 6: Risks and Gotchas for the Planner

### Risk 1: Phase 03-04 may not have been executed yet

The Phase 3 Plan 04 (Supabase products table + seed + mock-to-Supabase swap in catalog) has a PLAN file but no SUMMARY file — which means it has not yet been executed. Phase 4 depends on the products table existing in Supabase.

**Mitigation:** Phase 4 Plan 01 should check whether 03-04 has been run. If the products table does not exist, run 03-04 first. Alternatively, Plan 04-01 can bundle the 03-04 execution into its human gate instructions. The plans should note this dependency explicitly.

### Risk 2: Product type extension breaks CatalogProductCard

Adding `images?: string[]` to the Product interface is backward-compatible (optional field). But the Supabase products table row type will diverge from the TypeScript `Product` type until `src/types/supabase.ts` is regenerated. The cast pattern used in catalog page.tsx (`row.variants as unknown as ProductVariant[]`) will need to be extended.

**Mitigation:** Plan 04-01 must include regenerating types OR manually updating `src/types/supabase.ts` to add the `images` column.

### Risk 3: notFound() for invalid slugs

The detail page needs to handle `null` from Supabase when a slug does not match. Next.js 15 provides `notFound()` from `next/navigation` which triggers the nearest `not-found.tsx`. This needs to be called explicitly — the page will not automatically 404.

**Mitigation:** Always check `if (!product) notFound()` after the Supabase query. This is a must-have in Plan 04-02.

### Risk 4: Reviews table UUID referencing products

The reviews seed SQL above uses a subquery `select id ... where slug = '...'` to resolve the product UUID. This only works after the products table is seeded with real rows. If the developer runs the reviews DDL before seeding products, the FK constraint will prevent insert.

**Mitigation:** Reviews seed SQL must run AFTER products are seeded. Plan 04-01 should document the order: (1) products DDL + seed (from 03-04), then (2) reviews DDL + seed.

### Risk 5: Quantity + thread colour are NOT in the current type

The requirements say "size, quantity, thread colour" as variant dimensions. The current `ProductVariant.name` only encodes size. Quantity is a separate user input. Thread colour does not exist in the data model at all.

**Mitigation:** Plan 04-03 must handle this explicitly:
- Quantity: simple `useState` number stepper (1–10), not derived from variants
- Thread colour: render static placeholder swatches with a "Available colours" label — no data driving it in Phase 4. Add a TODO comment for Phase 5 to wire this to real data.
- Document this scope decision clearly so the planner doesn't try to solve thread colour data modelling in Phase 4.

### Risk 6: Add to Cart is a Phase 5 no-op

The cart context does not exist yet (Phase 5). The Add to Cart button must call nothing in Phase 4 — it should display as active (not disabled) but have a TODO comment. Follow the same pattern as `AddToCartModal` which calls `onClose()` with a TODO.

**Mitigation:** Button onClick calls a no-op console.log or empty function with a `// TODO Phase 5: wire to cart context` comment.

### Risk 7: Single image products need gallery fallback

All 6 current products have only one image (the placeholder SVG). The `ProductImageGallery` component must not break or show an empty thumbnail rail when only one image exists.

**Mitigation:** When `images.length <= 1`, suppress the thumbnail rail entirely. Show only the main image area. The thumbnail rail appears only when there are 2+ images.

### Risk 8: Header z-index stacking

The Header uses `z-30`. Any overlay (if introduced in the product page, e.g. a lightbox) must use `z-50`. Follow the pattern from `AddToCartModal` and `MobileDrawer` which already use `z-50`.

---

## Architecture Patterns

### Recommended project structure

```
src/app/catalog/[slug]/
└── page.tsx                    # Server Component — fetch + layout

src/components/product/
├── ProductImageGallery.tsx     # 'use client'
├── ProductDetailClient.tsx     # 'use client'
├── ProductReviews.tsx          # Server Component
└── UpsellBlock.tsx             # Server Component
```

### Pattern: Server Component wrapping Client island

```typescript
// page.tsx (Server Component)
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProductDetailClient } from '@/components/product/ProductDetailClient'
import { ProductReviews } from '@/components/product/ProductReviews'
import { UpsellBlock } from '@/components/product/UpsellBlock'
import type { Product } from '@/lib/types/product'
import type { Review } from '@/lib/types/review'

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!product) notFound()

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*')
    .eq('product_id', product.id)
    .order('created_at', { ascending: false })

  let shearsProduct: Product | null = null
  if (product.material !== 'Tools') {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('slug', 'shears')
      .single()
    shearsProduct = data
  }

  return (
    <main className="bg-cream min-h-screen">
      <ProductDetailClient product={product as Product} />
      <ProductReviews reviews={(reviews ?? []) as Review[]} />
      {shearsProduct && <UpsellBlock shears={shearsProduct as Product} />}
    </main>
  )
}
```

### Pattern: Inline variant picker (adapted from AddToCartModal)

```typescript
// ProductDetailClient.tsx
'use client'
import { useState } from 'react'
import { Product } from '@/lib/types/product'
import { ProductImageGallery } from './ProductImageGallery'

export function ProductDetailClient({ product }: { product: Product }) {
  const [selectedVariantId, setSelectedVariantId] = useState(
    product.variants.find(v => v.in_stock)?.id ?? product.variants[0]?.id ?? ''
  )
  const [quantity, setQuantity] = useState(1)

  const selectedVariant = product.variants.find(v => v.id === selectedVariantId)

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Left: Image gallery */}
        <ProductImageGallery
          images={product.images?.length ? product.images : [product.image]}
          alt={product.name}
        />

        {/* Right: Product info + variant picker */}
        <div>
          <h1 className="font-display text-3xl md:text-4xl text-cocoa mb-2">
            {product.name}
          </h1>
          <p className="font-heading text-xl text-gold mb-4">
            ₦{(selectedVariant?.price ?? product.price_min).toLocaleString()}
          </p>
          {/* Variant buttons */}
          <div className="flex flex-wrap gap-2 mb-6">
            {product.variants.map((variant) => (
              <button
                key={variant.id}
                onClick={() => { if (variant.in_stock) setSelectedVariantId(variant.id) }}
                disabled={!variant.in_stock}
                className={/* same pattern as AddToCartModal */ ''}
              >
                {variant.name}
                {!variant.in_stock && <span className="block text-xs">(Out of stock)</span>}
              </button>
            ))}
          </div>
          {/* Quantity stepper */}
          {/* Thread colour placeholder */}
          {/* Add to Cart button — Phase 5 no-op */}
          <button
            onClick={() => { /* TODO Phase 5: wire to cart context */ }}
            className="w-full bg-gold text-cocoa font-heading font-semibold py-3 rounded-lg hover:bg-terracotta hover:text-cream transition-colors"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Body scroll lock on modal/drawer | Custom CSS overflow manipulation | Already done in `MobileDrawer.useEffect` — copy the exact pattern |
| Backdrop overlay | Custom z-index stacking | `fixed inset-0 z-40 bg-cocoa/60` — already established |
| Image optimisation | Raw `<img>` tags | `next/image` with `fill` + `sizes` — already in `CatalogProductCard` |
| Out-of-stock button state | Custom disabled logic | `opacity-40 cursor-not-allowed` pattern from `AddToCartModal` |
| Product card in upsell | New card component | Reuse `CatalogProductCard` directly — it's already a Server Component |
| 404 handling | Custom error UI | `notFound()` from `next/navigation` — triggers Next.js 404 page |

---

## Common Pitfalls

### Pitfall 1: Forgetting notFound() for invalid slugs
**What goes wrong:** Supabase `.single()` returns `null` data with an error when no row matches. If not handled, the page crashes with a null reference error when trying to render `product.name`.
**How to avoid:** Always check `if (!product) notFound()` immediately after the Supabase query. Import `notFound` from `next/navigation`.

### Pitfall 2: ProductDetailClient receives non-serialisable Supabase row type
**What goes wrong:** The Supabase-generated row type for `products` has `variants: Json` (not `ProductVariant[]`) and `images: string[] | null` (not `string[] | undefined`). Passing the raw row to a Server Component prop that accepts `Product` will throw TypeScript errors.
**How to avoid:** Cast in page.tsx with the same pattern used in catalog:
```typescript
const product: Product = {
  ...rawProduct,
  variants: rawProduct.variants as unknown as ProductVariant[],
  images: rawProduct.images ?? undefined,
}
```

### Pitfall 3: Reviews table FK constraint during seeding
**What goes wrong:** If the reviews seed SQL runs before the products table has rows (or before 03-04 is executed), the FK constraint `references public.products(id)` will reject all inserts.
**How to avoid:** Plan 04-01 must document the exact execution order: products table + seed first (03-04), then reviews table + seed.

### Pitfall 4: Thread colour variant dimension — don't model it in Phase 4
**What goes wrong:** The requirements mention thread colour but no data model supports it. Attempting to add a new variant dimension (requiring a schema redesign) will block Phase 4 and bleed into Phase 5 scope.
**How to avoid:** Phase 4 renders thread colour as a static placeholder. Data modelling for thread colour is Phase 5 work, co-located with cart line item design.

### Pitfall 5: Gallery thumbnail rail with 1 image looks broken
**What goes wrong:** If 1 image renders a thumbnail rail with a single tiny thumbnail, it looks like a bug.
**How to avoid:** `ProductImageGallery` conditionally renders the thumbnail rail only when `images.length > 1`.

### Pitfall 6: Supabase client import in Server Component vs Client Component
**What goes wrong:** Using `createClient` from `@/lib/supabase/server` inside a Client Component (`'use client'`) will fail at runtime because server-side cookies APIs are unavailable.
**How to avoid:** All Supabase fetches happen in the Server Component (`page.tsx`). Client islands receive data as props only.

---

## State of the Art (Relevant to This Phase)

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Modal-based variant selection (Phase 2 AddToCartModal) | Inline variant picker on detail page | Better conversion; visitor already on the page |
| Single `image` field per product | `images?: string[]` + fallback to `image` | Enables gallery without breaking catalog cards |
| Mock reviews in a `.ts` file | Supabase reviews table with real rows | Phase 6 admin can add reviews without code changes |

---

## Open Questions

1. **Thread colour data model**
   - What we know: Thread colour is in the product requirements (PROD-04) but not in the current `ProductVariant` type
   - What's unclear: Should thread colour be a separate `thread_colours` column on `products` (array of colour names/hex), or should variants become a more complex JSONB structure?
   - Recommendation: Defer to Phase 5. In Phase 4, render static placeholder colour swatches (e.g. 5 hardcoded circles). Add a schema note for Phase 5 to design the thread colour dimension.

2. **Product not found page**
   - What we know: `notFound()` triggers the nearest `not-found.tsx`
   - What's unclear: Whether a custom `not-found.tsx` has been created for the catalog route
   - Recommendation: Check during Plan 04-02 execution; if absent, add a minimal `src/app/catalog/[slug]/not-found.tsx` with a link back to /catalog.

3. **Images column default and migration**
   - What we know: Adding `images text[]` to the products table with `default '{}'` is backward-compatible
   - What's unclear: Whether Supabase CLI is set up for migrations or whether all schema changes are done via SQL Editor
   - Recommendation: Continue the Phase 3 pattern (SQL Editor, add to `schema.sql`). No CLI migration workflow needed until the project scales.

---

## Sources

### Primary (HIGH confidence)
- Codebase read directly:
  - `src/lib/types/product.ts` — canonical Product type
  - `src/app/catalog/[slug]/page.tsx` — stub examined
  - `src/lib/mock/products.ts` — all 6 products and their variant shapes
  - `src/components/home/AddToCartModal.tsx` — variant picker pattern
  - `src/components/layout/MobileDrawer.tsx` — drawer shell pattern
  - `src/components/catalog/CatalogProductCard.tsx` — card + Image pattern
  - `src/app/globals.css` — Tailwind v4 token definitions
  - `next.config.ts` — image configuration (dangerouslyAllowSVG, Supabase remote pattern)
  - `.planning/phases/03-product-catalog/03-RESEARCH.md` — prior architecture decisions
  - `.planning/STATE.md` and `.planning/PROJECT.md` — project constraints and decisions

### Secondary (MEDIUM confidence)
- Next.js 15 `notFound()` API behaviour — verified against established Next.js 15 patterns already used in the codebase (async params pattern)
- Supabase FK constraint behaviour — consistent with PostgreSQL standard behaviour

---

## Metadata

**Confidence breakdown:**
- Codebase inventory: HIGH — files read directly
- Type extension plan: HIGH — backward-compatible, follows established pattern
- Reviews schema: HIGH — standard Supabase table design matching existing products schema style
- Component breakdown: HIGH — follows established Server/Client island pattern from Phase 3
- Thread colour deferral: HIGH — correct scope decision, not a Phase 4 concern
- Upsell logic: HIGH — product data already exists, display-only concern

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (stable stack; Supabase and Next.js 15 APIs unlikely to change)
