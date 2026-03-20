# Phase 3: Product Catalog - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Browsable, filterable, searchable catalog page at /catalog displaying all 6 loc bead products (24K Gold Beads, Gold Beads, Silver Beads, Onyx Beads, Crystal Clear Beads, Shears) — with data migrated from WooCommerce into Supabase. Product detail, cart, and reviews are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Product card design
- Price display: "From ₦X" using the lowest variant price
- Each card shows: product image, product name, category badge, stock status indicator
- Card CTA: clicking navigates to the product detail page (/catalog/[slug]) — no quick-add modal on catalog
- Grid layout: 1 column on mobile, 3 columns on desktop

### Filter & sort layout
- Desktop: top bar with horizontal filter chips (category) + sort dropdown — not a sidebar
- Mobile: "Filter" button opens a slide-in filter drawer
- Categories by material: Gold, Silver, Crystal, Tools
  - Gold: 24K Gold Beads, Gold Beads
  - Silver: Silver Beads
  - Crystal: Crystal Clear Beads, Onyx Beads
  - Tools: Shears
- Filter updates instantly on tap — no Apply button required
- Sort options: Price low-to-high, Price high-to-low, Latest (as per roadmap success criteria)

### Search placement & behavior
- Search input lives in the same top bar as the filter chips and sort control
- Live as-you-type filtering — results update with each keystroke
- Search resets active category filters — search and filters do not stack
- Empty state: show all products with a message "No products match '[query]' — showing all products"

### Data migration scope
- Migration method: manual entry via Supabase dashboard (6 products, one-time)
- Supabase products table fields (beyond Phase 2 MockProduct):
  - slug — URL-friendly identifier for /catalog/[slug]
  - material — filter category (Gold, Silver, Crystal, Tools)
  - variant stock levels — per-size in_stock boolean (mirrors Phase 2 mock)
  - WooCommerce ID: not needed
- Images: continue with SVG placeholder (placeholder-bead.svg) — real images handled in Phase 6 admin upload
- Build sequencing: build catalog UI with mock data first, swap to Supabase at end of Phase 3 (one-line swap, same MockProduct interface pattern as Phase 2)

### Claude's Discretion
- Exact visual styling of filter chips (size, spacing, active state colour)
- Skeleton loading state while data fetches
- Card hover/focus states
- Exact Supabase table name and column naming conventions
- Onyx Beads category assignment (treated as Crystal/gemstone alongside Crystal Clear Beads)

</decisions>

<specifics>
## Specific Ideas

- Phase 2 props-down pattern should be preserved: page.tsx owns data and passes as typed props — enables the one-line mock-to-Supabase swap at end of phase
- MockProduct interface from src/lib/mock/ should be extended/replaced with a real Product type that matches the Supabase schema

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-product-catalog*
*Context gathered: 2026-03-20*
