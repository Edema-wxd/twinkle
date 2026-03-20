# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-19)

**Core value:** A Nigerian customer on mobile can discover, customise, and buy loc beads in under 2 minutes — and a diaspora customer anywhere in the world can do the same.
**Current focus:** Phase 2 — Homepage

## Current Position

Phase: 2 of 10 (Homepage)
Plan: 3 of 3 in current phase
Status: Phase complete
Last activity: 2026-03-20 — Completed 02-03 interactive client islands (FeaturedProductsSection, TestimonialsSection) and full homepage assembly

Progress: [██░░░░░░░░] 20%

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Total execution time: 1 session + ongoing

**By Phase:**

| Phase | Plans | Status |
|-------|-------|--------|
| 1. Foundation | 4/4 | Complete |
| 2. Homepage | 3/3 | Complete |

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

### Pending Todos

None.

### Blockers/Concerns

- FOUND-05 (Supabase project configured with schema/storage/auth) is partially done — typed client exists but cloud project setup deferred to Phase 3
- .env.local has placeholder values — real Supabase URL and keys needed before Phase 2 featured products work

## Session Continuity

Last session: 2026-03-20
Stopped at: Completed 02-03-PLAN.md — interactive islands (FeaturedProductsSection, AddToCartModal, TestimonialsSection) and full homepage assembly at src/app/page.tsx
Resume file: None
