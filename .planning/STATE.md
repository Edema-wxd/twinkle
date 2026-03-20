# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-19)

**Core value:** A Nigerian customer on mobile can discover, customise, and buy loc beads in under 2 minutes — and a diaspora customer anywhere in the world can do the same.
**Current focus:** Phase 3 — Product Catalog

## Current Position

Phase: 3 of 10 (Product Catalog)
Plan: 3 of TBD in current phase
Status: In progress
Last activity: 2026-03-20 — Completed 03-03-PLAN.md (CatalogClient + route wiring)

Progress: [████░░░░░░] 26%

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Total execution time: 1 session + ongoing

**By Phase:**

| Phase | Plans | Status |
|-------|-------|--------|
| 1. Foundation | 4/4 | Complete |
| 2. Homepage | 3/3 | Complete |
| 3. Product Catalog | 3/TBD | In progress |

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

### Pending Todos

None.

### Blockers/Concerns

- FOUND-05 (Supabase project configured with schema/storage/auth) is partially done — typed client exists but cloud project setup deferred to Phase 3
- .env.local has placeholder values — real Supabase URL and keys needed before Phase 2 featured products work

## Session Continuity

Last session: 2026-03-20
Stopped at: Completed 03-03-PLAN.md — CatalogClient, /catalog page, /catalog/[slug] stub all built and committed
Resume file: None
