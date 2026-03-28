# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-19)

**Core value:** A Nigerian customer on mobile can discover, customise, and buy loc beads in under 2 minutes — and a diaspora customer anywhere in the world can do the same.
**Current focus:** Phase 8 — Conversion

## Current Position

Phase: 8 (Conversion) — In progress
Plan: 1 of 2 in Phase 8
Status: In progress
Last activity: 2026-03-28 — Completed 08-01-PLAN.md (newsletter_subscribers table DDL, TypeScript types, POST /api/newsletter/subscribe)

Progress: [█] 1/2 plans (Phase 8)

## Performance Metrics

**Velocity:**
- Total plans completed: 39
- Total execution time: 1 session + ongoing

**By Phase:**

| Phase | Plans | Status |
|-------|-------|--------|
| 1. Foundation | 4/4 | Complete |
| 2. Homepage | 3/3 | Complete |
| 3. Product Catalog | 3/3 | Complete |
| 4. Product Detail | 4/4 | Complete |
| 4.1. CSV Price Import | 2/2 | Complete |
| 5. Cart & Checkout | 9/9 | Complete |
| 6. Admin Panel | 8/8 | Complete |
| 7. Content Pages | 6/6 | Complete |
| 8. Conversion | 1/2 | In progress |

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
- **CartDrawer globally mounted in Providers**: CartDrawer is a sibling of children inside CartProvider in providers.tsx — always mounted, always responds to OPEN_DRAWER regardless of current route
- **Header Cart button dispatches OPEN_DRAWER**: Cart text in header replaced with button that dispatches OPEN_DRAWER (not Link to /cart) — drawer-first UX; /cart still accessible from mobile nav
- **Header badge capped at 9+**: totalItems > 9 renders '9+' label in badge — standard e-commerce convention
- **Checkout CTA disabled div when empty**: renders as aria-hidden div with pointer-events-none when cart empty — consistent footer height, no layout shift
- **Cart page 'use client'**: /cart is a client component (reads CartContext); metadata export omitted — client components cannot export metadata in Next.js App Router
- **Cart page two-column grid**: md:grid-cols-3 with items md:col-span-2 + summary md:col-span-1; subtotal derived inline from items.reduce
- **Webhook await-before-return**: handleChargeSuccess awaited before 200 response — Paystack allows 10s and 2 DB inserts are fast; guarantees order is persisted before acknowledgement
- **Webhook idempotency via maybeSingle()**: orders queried by paystack_reference using maybeSingle (not single) — returns null data on no match without error; prevents duplicate order on repeat webhook delivery
- **Webhook service-role client inline**: createClient with auth.persistSession:false, no cookie adapter — distinct from cookie-based server.ts helper; no session management needed for service-role writes
- **Middleware api/webhooks exclusion**: api/webhooks added to negative lookahead in config.matcher — Paystack webhook bypasses Supabase session refresh and lowercase redirect
- **Paystack dynamic import in click handler**: `const PaystackPop = (await import('@paystack/inline-js')).default` inside handlePay — avoids SSR crash; SDK manipulates window/document at import time
- **Paystack metadata cast as any**: @types restricts metadata to custom_fields[] but runtime accepts arbitrary JSON; cast with comment to pass cart+shipping data
- **Checkout shipping zones**: Lagos ₦3,000 / all others ₦4,500 — NIGERIAN_STATES constant (37) drives dropdown; getShippingCost pure function
- **WhatsApp placeholder 2348000000000**: TODO comment in CheckoutForm and checkout/page.tsx — replace with real business number before launch
- **Checkout reference via useState initialiser**: `useState(() => 'TW-' + Date.now() + ...)` — stable across re-renders, avoids undefined on first render
- **Order confirmation server-first**: /orders/[reference] page.tsx uses service-role client server-side; renders OrderConfirmationView directly when order exists — zero client JS for post-webhook loads
- **OrderPoller immediate fetch + Realtime**: immediate fetch on mount covers race window; Realtime postgres_changes INSERT subscription covers delayed webhook; follow-up full fetch on Realtime event (payload.new lacks order_items)
- **No notFound() on unknown reference**: unrecognised paystack_reference is a valid pending state (webhook in flight), not a 404 — OrderPoller handles gracefully with 30s timeout
- **unknown cast for nested Supabase select**: select('*, order_items(*)') returns SelectQueryError when Relationships: [] — cast via unknown to FullOrder is standard workaround for manual supabase.ts
- **getUser() not getClaims() for admin guard**: middleware uses getUser() for admin paths — validates against auth server, not just local JWT (CVE-2025-29927)
- **Double auth check (belt-and-braces)**: middleware guard + per-page layout.tsx check + individual page check — admin routes always verify at every layer
- **loginAction uses cookie client, not admin client**: auth sessions are user-scoped (cookies); service-role admin client is for data operations only, never for auth flows
- **Admin route group (admin) isolated**: own layout.tsx that never imports CartProvider/Header/Footer — storefront and admin shells are fully separate
- **Dashboard stats in page.tsx**: date range computation (today/weekStart/monthStart) done in Server Component page; passes pre-computed { count, totalSales } to StatsPanel — no separate utils file
- **StatsPanel 'use client' only**: tab state needs client; RecentOrdersTable is Server Component (no interactivity) — minimal hydration footprint
- **Naira format pattern**: '₦' + amount.toLocaleString('en-NG') used consistently in admin components
- **Short paystack_reference**: .slice(-8).toUpperCase() for table Order # display
- **Catalog migrated to Supabase in 06-03**: /catalog now uses Supabase with .eq('is_active', true); mock data replaced
- **Optimistic toggle pattern**: ProductListTable uses Record<id,boolean> state initialised from server props; PATCH updates locally on success
- **Admin product list fetches all products**: createAdminClient() with no is_active filter — admin sees active + archived
- **Admin reviews fetches active products only**: product picker in ReviewForm only shows is_active=true products
- **Settings upsert batched**: all settings fields sent in single PUT; server builds array + .upsert(rows, { onConflict: 'key' }) once
- **Admin form pattern**: Server Component page fetches data via createAdminClient(), passes as props to 'use client' form component; form POSTs/PUTs to /api/admin/*
- **Toast pattern across admin**: useState<{type,message}|null> + setTimeout(3000) — consistent in ReviewForm, SettingsForm, ProductForm
- **Tiptap immediatelyRender: false**: Required for App Router SSR; prevents hydration mismatch on RichTextEditor
- **price_tiers API enforcement**: API routes enforce price_tiers shape — missing tiers default to [{qty:1,price:variant.price}]; storefront pack-size picker safe for admin-created products
- **ProductForm dual-mode**: product prop undefined = create mode (POST), defined = edit mode (PUT); delete only in edit mode with inline confirm
- **Slug auto-gen on name blur**: generates from name only when slug is empty AND not in edit mode — avoids overwriting existing slugs
- **ImageUploader PointerSensor only**: handles mouse + touch via pointer events; no separate TouchSensor needed
- **Remove button stopPropagation on onPointerDown**: prevents dnd-kit swallowing click; onClick fires normally
- **Browser upload pattern**: createBrowserClient() + storage.from('product-images').upload() + getPublicUrl() — no Next.js server round-trip; avoids 413 body size limit
- **tempId for new products**: useState(() => crypto.randomUUID()) gives stable upload path prefix before product ID exists
- **image/images in ProductForm payload**: image = imageUrls[0] ?? placeholder SVG; images = imageUrls (ordered array)
- **about_sections text PK**: fixed set of sections ('founder-story' | 'brand-mission' | 'why-loc-beads' | 'contact') — text PK enables meaningful upsert by ID
- **blog_posts freeform tag**: no separate tags/categories table in v1 — avoids join complexity
- **faqs answer plain text**: FAQ answers don't need Tiptap HTML; plain text simpler to render
- **shipping_* settings keys**: shipping content uses existing settings table under shipping_lagos_rate, shipping_other_rate, shipping_lagos_days, shipping_other_days, shipping_intl_message, shipping_page_intro — no new DB table
- **Shipping API key allowlist**: PUT /api/admin/shipping iterates ALLOWED_SHIPPING_KEYS constant — only those 6 keys can ever be written; prevents arbitrary settings injection
- **Shipping page fallback defaults**: all 6 shipping keys have hardcoded defaults in shipping/page.tsx — page renders correctly before settings are configured
- **blog_posts RLS public read filter**: published=true only for public; drafts require service-role client in admin
- **AboutStickyNav DOM-first**: reads section elements directly via getElementById — no props from page.tsx; page stays Server Component
- **[&_tag]: selectors replace prose**: @tailwindcss/typography not installed; about body HTML uses custom Tailwind selectors for heading/paragraph/list/link styling
- **content-images bucket**: separate from product-images; about section image uploads go to about/{sectionId}/{timestamp}-{filename}
- **display_order defaults to array index in API**: PUT /api/admin/pages sets display_order to row's index in payload if not provided — satisfies Insert required field without form tracking it
- **CSS grid accordion animation**: grid-rows-[0fr/1fr] with overflow-hidden transition-all — no JS height measurement; works natively with Tailwind v4
- **FaqAccordion leaf island**: /faq page.tsx is Server Component, passes faqs as props to FaqAccordion ('use client') — consistent with client island pattern
- **FaqForm dual-mode**: optional faq prop drives create vs edit — POST to /api/admin/faqs (create) or PUT to /api/admin/faqs/[id] (edit); same component
- **BlogPostForm single-file upload**: inline click-to-upload handler (not ImageUploader) for featured image — one image only, no DnD complexity
- **published_at transition guard**: PUT /api/admin/blog/[id] fetches current post first, only auto-sets published_at when transitioning from false to true — no overwrite on subsequent saves
- **Slug conflict as 409**: Postgres unique constraint violation code 23505 mapped to HTTP 409 for blog posts (same pattern as products)
- **BlogCategoryFilter Suspense wrapper**: useSearchParams() requires Suspense boundary when parent page is Server Component in Next.js 15 App Router — BlogCategoryFilter wrapped in <Suspense> in blog/page.tsx
- **Server-constructed canonical URL for share buttons**: BlogShareButtons receives canonicalUrl string prop built in Server Component from NEXT_PUBLIC_SITE_URL — avoids window.location.href SSR crash in client component
- **Draft blog posts are 404**: /blog/[slug] uses .eq('published', true) in query; notFound() on error or null — draft posts are never accessible on public pages (not a pending state like orders)
- **WhatsApp share wa.me/?text= (no phone)**: blog share opens contact picker; distinct from checkout WhatsApp CTA which dials the business number
- **newsletter_subscribers RLS lockout guard only**: no public SELECT/INSERT/UPDATE/DELETE policies — all writes via service-role API route; RLS blocks any direct client access
- **Email lowercase-normalised before newsletter insert**: `email.trim().toLowerCase()` ensures case-insensitive duplicate detection via unique constraint; 23505 maps to 409
- **newsletter source_page optional**: allows tracking signup origin (homepage, blog, etc.) without making it mandatory; null if not provided

### Roadmap Evolution

- Phase 4.1 inserted after Phase 4: CSV Price Import (URGENT) — import real pricing from 'Twinke Locs Prices .csv' into Supabase before Cart phase begins

### Pending Todos

None.

### Blockers/Concerns

- FOUND-05 (Supabase project configured with schema/storage/auth) is partially done — typed client exists but cloud project setup deferred to Phase 3
- .env.local has placeholder values — real Supabase URL and keys needed before Phase 2 featured products work

## Session Continuity

Last session: 2026-03-28
Stopped at: Completed 08-01-PLAN.md — newsletter_subscribers table DDL, TypeScript types, POST /api/newsletter/subscribe endpoint
Resume file: None
