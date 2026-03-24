# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-19)

**Core value:** A Nigerian customer on mobile can discover, customise, and buy loc beads in under 2 minutes — and a diaspora customer anywhere in the world can do the same.
**Current focus:** Phase 5 — Cart & Checkout

## Current Position

Phase: 5 (Cart & Checkout)
Plan: 5 of N in current phase
Status: In progress — plan 05 done
Last activity: 2026-03-24 — Completed 05-05-PLAN.md (dedicated /cart page)

Progress: [███████░░░] 70%

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Total execution time: 1 session + ongoing

**By Phase:**

| Phase | Plans | Status |
|-------|-------|--------|
| 1. Foundation | 4/4 | Complete |
| 2. Homepage | 3/3 | Complete |
| 3. Product Catalog | 3/3 | Complete |
| 4. Product Detail | 4/4 | Complete |
| 4.1. CSV Price Import | 2/2 | Complete |
| 5. Cart & Checkout | 2/N | In progress |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Full rebuild over headless WP: Cleaner codebase, full control, better performance
- Supabase over WooCommerce REST API: Full data ownership, single system
- Blog in Supabase: All content editable from one admin panel
- International shipping = contact-for-quote flow in v1
- Staging-first deployment: Validate before DNS cutover
- **Halimun font**: Commercial licence purchased, using Halimun.ttf (not Playfair Display placeholder)
- **Tailwind v4**: Using @import "tailwindcss" + @theme (no tailwind.config.js)
- **middleware.ts**: getClaims() used for auth (not getSession()), lowercase redirect runs before Supabase client
- **Mock data in src/lib/mock/**: Phase 2 homepage data lives here until Phase 3 Supabase tables exist; MockProduct interface mirrors Phase 3 schema for one-line swap
- **SVG placeholder image**: public/images/products/placeholder-bead.svg with brand colours; next.config.ts updated with dangerouslyAllowSVG + CSP
- **Large variant out of stock**: All 4 featured products have Large (8mm) variant in_stock: false, exercises out-of-stock UI state in size picker modal
- **bg-linear-to-br (Tailwind v4 gradient)**: Use `bg-linear-to-br` not `bg-gradient-to-br` — v3 syntax does not work with Tailwind v4
- **Server Components default**: Homepage sections have no interactivity — no `use client`; keep all homepage sections as Server Components unless interactivity required
- **External links**: Use `<a>` not `Link` for external URLs; always add `target="_blank" rel="noopener noreferrer"`
- **Client island pattern**: FeaturedProductsSection and TestimonialsSection are `'use client'` leaf islands; page.tsx remains a Server Component importing mock data and passing as props
- **Props-down data flow**: page.tsx owns data imports and passes as typed props — FeaturedProductsSection and TestimonialsSection accept props (not direct imports), enabling Phase 3 one-line swap to Supabase data
- **Functional updater in interval**: useEffect intervals use `setIdx(i => (i + 1) % n)` functional updater with `n` (not `idx`) in deps — avoids stale closure without unnecessary interval teardown
- **AddToCartModal Phase 2 no-op**: "Add to cart" button calls onClose() in Phase 2 — TODO comment in place for Phase 5 cart context wiring
- **Canonical Product type**: src/lib/types/product.ts is single source of truth — Product, ProductVariant, ProductMaterial; mock and Supabase layers both import from here
- **FEATURED_PRODUCTS derived**: FEATURED_PRODUCTS = CATALOG_PRODUCTS.filter(p => p.is_featured) — no duplication
- **MockProduct backward-compat re-export**: products.ts exports `type { Product as MockProduct }` — safe migration path
- **Crystal Clear Beads all in_stock**: All 3 variants (4mm/6mm/8mm) in_stock: true; Shears single Standard variant ₦3500
- **CatalogProductCard Server Component**: No 'use client' — uses only Link + Image; safe for RSC trees without hydration overhead
- **Category/SortOrder types in FilterBar.tsx**: Co-located with the component that defines them; CatalogClient imports from './FilterBar' (not a separate types file)
- **FilterDrawer wraps MobileDrawer**: Reuses existing drawer behaviour (body-scroll lock, Escape key) — not reimplemented
- **CatalogClient search-takes-priority**: useMemo bypasses category filter when searchQuery non-empty — no setActiveCategory('All') call; FilterBar chips retain visual state
- **Empty search fallback to all products**: showEmptyMessage renders message + full products prop (not empty filteredProducts array) — no blank grid
- **Next.js 15 async params**: /catalog/[slug]/page.tsx uses `params: Promise<{ slug: string }>` + `await params` per Next.js 15 dynamic route contract
- **images field optional on Product**: `images?: string[]` added to Product type — CatalogProductCard uses `image` (thumbnail); gallery falls back to `[image]` when images absent
- **Manual supabase.ts**: hand-maintained Database type until Supabase CLI gen is configured; regenerate command in header comment of src/types/supabase.ts
- **reviews RLS**: public SELECT, service-role INSERT — reviews table readable without auth; writes require service role
- **Supabase result.data pattern**: `const result = await supabase...single(); if (result.error || !result.data) return notFound(); const row = result.data` — destructuring before guard kills TS narrowing
- **Supabase GenericTable Relationships**: Database type must include `Relationships: []` per table; empty dicts must be `{ [_ in never]: never }` not `Record<string, never>` to satisfy GenericSchema
- **ProductImageGallery thumbnail rail**: only rendered when `images.length > 1`; all current products have single image so rail is always hidden
- **object-contain in gallery**: SVG placeholder has transparent bg; use object-contain not object-cover to preserve aspect ratio inside bg-stone container
- **Fragment-as-grid-children**: ProductDetailClient returns `<>` with gallery + info div as two direct grid children — no wrapper div needed; CSS grid places them in two columns automatically
- **Gallery internal to ProductDetailClient**: ProductImageGallery co-located inside ProductDetailClient (single 'use client' boundary) — eliminates second client island
- **First-in-stock initialisation**: variant picker pre-selects `product.variants.find(v => v.in_stock)?.id` in useState — skips disabled variants on first render
- **UpsellBlock max-w-xs constraint**: CatalogProductCard in UpsellBlock wrapped in max-w-xs div to prevent card stretching full section width
- **Conditional upsell guard**: product.material !== 'Tools' check in page.tsx controls whether shears fetch runs — no unnecessary Supabase query for Tools products
- **UpsellBlock max-w-xs constraint**: CatalogProductCard in UpsellBlock wrapped in max-w-xs div to prevent card stretching full section width
- **Thread colour swatches hidden for Tools**: ProductDetailClient suppresses colour swatch section when product.material === 'Tools' — shears page has no colour variants
- **PriceTier required on ProductVariant**: `price_tiers: PriceTier[]` is required (not optional); variant.price = lowest tier for display/sort; full tiers in price_tiers array
- **PriceTier shape**: `{ qty: number; price: number }` — matches Supabase JSONB shape exactly; Shears uses `[{qty:1,price:3500}]` for consistent shape without special-casing
- **24K Gold 2mm has 5 tiers from qty 25**: all other 2mm/4mm start at qty 50; all 6mm start at qty 25
- **selectedTierQty state**: ProductDetailClient tracks selectedTierQty alongside selectedVariantId; handleVariantChange resets tier to new variant's first tier on size switch — Phase 5 reads both for cart wiring
- **Pack-size picker conditional render**: only shown when price_tiers.length > 1; Shears (single tier) gets no picker and no "Pack of N beads" label
- **displayPrice fallback chain**: selectedTier?.price ?? selectedVariant?.price ?? product.price_min
- **orders/order_items no RLS**: service-role access only — all reads/writes via server-side API routes
- **order_items denormalized snapshot**: product_name, variant_name, unit_price, tier_qty captured at purchase time — history immutable if products change
- **thread_colour nullable on order_items**: Tools products (Shears) have no thread colour; consistent with Phase 4 suppression
- **order status defaults to 'paid'**: webhook sets this explicitly; admin advances through processing/shipped/delivered in Phase 6
- **Order convenience types**: Order, OrderInsert, OrderItem, OrderItemInsert exported from src/types/supabase.ts
- **CartProvider HYDRATE after mount**: localStorage read dispatched in useEffect([]) — avoids SSR/hydration mismatch; initial render always uses empty state
- **selectedThreadColour null sentinel**: initialised null for bead products, '' for Tools — null = not yet selected (button disabled); canAddToCart = material === 'Tools' || selectedThreadColour !== null
- **handleVariantChange cascades resets**: size switch resets both selectedTierQty (to new variant's first tier) and selectedThreadColour (null for beads) in one handler
- **isDrawerOpen not persisted**: only state.items written to localStorage; drawer always closed on fresh page load
- **ADD_ITEM opens drawer**: isDrawerOpen set true on every ADD_ITEM — cart drawer auto-opens per spec
- **lineKey includes threadColour**: same size+pack but different thread colour = separate line items; identical size+pack+colour merges quantity
- **Providers pattern**: src/components/providers.tsx is 'use client'; layout.tsx imports Providers and wraps body content — layout remains a Server Component
- **Cart page 'use client'**: /cart is a client component (reads CartContext); metadata export omitted — client components cannot export metadata in Next.js App Router
- **Cart page two-column grid**: md:grid-cols-3 with items md:col-span-2 + summary md:col-span-1; subtotal derived inline from items.reduce

### Roadmap Evolution

- Phase 4.1 inserted after Phase 4: CSV Price Import (URGENT) — import real pricing from 'Twinke Locs Prices .csv' into Supabase before Cart phase begins

### Pending Todos

None.

### Blockers/Concerns

- FOUND-05 (Supabase project configured with schema/storage/auth) is partially done — typed client exists but cloud project setup deferred to Phase 3
- .env.local has placeholder values — real Supabase URL and keys needed before Phase 2 featured products work

## Session Continuity

Last session: 2026-03-24
Stopped at: Completed 05-05-PLAN.md — dedicated /cart page with order summary panel
Resume file: None
