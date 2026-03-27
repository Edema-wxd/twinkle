# Roadmap: Twinkle Locs

## Overview

Twinkle Locs is a full rebuild of twinklelocs.com — replacing the existing WordPress/WooCommerce store with a custom Next.js 15 + Supabase storefront. The build progresses from scaffold and design system through product catalog, transactional checkout, admin tooling, content pages, conversion features, and SEO — culminating in a staged Vercel deployment ready for DNS cutover. Every phase delivers a coherent, verifiable capability before the next begins.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3...): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Scaffold, design tokens, Supabase, shared layout, WhatsApp button, URL conventions
- [x] **Phase 2: Homepage** - Brand-first entry point with hero, featured products, story, and testimonials
- [ ] **Phase 3: Product Catalog** - Data migration from WooCommerce + browsable, filterable, searchable catalog page
- [ ] **Phase 4: Product Detail** - Gallery, variant picker, reviews display, and upsell bundle suggestion
- [x] **Phase 5: Cart & Checkout** - Cart drawer + page, Paystack checkout, shipping logic, order confirmation
- [ ] **Phase 6: Admin Panel** - Protected /admin with product CRUD, image upload, order management, review entry, dashboard
- [ ] **Phase 7: Content Pages** - About/Founder, FAQ, Shipping Info, Blog listing and post pages
- [ ] **Phase 8: Conversion** - Footer newsletter signup (email capture)
- [ ] **Phase 9: SEO** - Metadata, OpenGraph, structured data, sitemap, URL slug enforcement
- [ ] **Phase 10: Staging Deployment** - Vercel staging URL, smoke test, pre-DNS-cutover checklist

## Phase Details

### Phase 1: Foundation
**Goal**: The project skeleton exists and every subsequent phase can build on it without revisiting infrastructure
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, SEO-04
**Success Criteria** (what must be TRUE):
  1. The app runs locally with Next.js 15 App Router, TypeScript, and Tailwind CSS — no build errors
  2. Afro-luxury colour palette and Halimun/Raleway/Inter fonts render correctly in a browser, sourced from self-hosted files
  3. Header, footer, and mobile navigation drawer are visible and functional on a 375px mobile viewport
  4. A WhatsApp floating button appears on every page and opens wa.me in a new tab when tapped
  5. All application URLs are lowercase slugs — no uppercase letters in any route or link
**Plans**: 4 plans

Plans:
- [x] 01-01-scaffold.md — Bootstrap Next.js 15, install Supabase packages, create folder structure
- [x] 01-02-design-tokens.md — Tailwind v4 @theme brand palette, self-hosted fonts (Halimun/Playfair + Raleway + Inter)
- [x] 01-03-supabase-middleware.md — Supabase SSR client pair, TypeScript types stub, combined middleware
- [x] 01-04-layout-components.md — Header, MobileDrawer, Footer, WhatsApp button wired into root layout

---

### Phase 2: Homepage
**Goal**: A visitor landing on the root URL sees a complete, on-brand homepage that communicates who Twinkle Locs is and drives them toward the catalog
**Depends on**: Phase 1
**Requirements**: CONT-01
**Success Criteria** (what must be TRUE):
  1. Visitor sees a hero section with headline, subheading, and a CTA button that links to the catalog
  2. A "Featured Products" section displays at least three products (mock data — Supabase not yet set up)
  3. A brand story section and testimonials section are visible on the page
  4. An Instagram link (to @twinklelocs) is present and opens in a new tab
**Plans**: 3 plans

Plans:
- [ ] 02-01-PLAN.md — Mock data layer: typed products + testimonials arrays, placeholder product image
- [ ] 02-02-PLAN.md — Server section components: HeroSection, BrandStorySection, InstagramCTASection
- [ ] 02-03-PLAN.md — Client islands + page assembly: FeaturedProductsSection, AddToCartModal, TestimonialsSection, page.tsx

---

### Phase 3: Product Catalog
**Goal**: A visitor can browse, filter, search, and discover all loc bead products — with data migrated from WooCommerce into Supabase
**Depends on**: Phase 2
**Requirements**: PROD-01, PROD-02, PROD-03
**Success Criteria** (what must be TRUE):
  1. All 6 existing products (24K Gold Beads, Gold Beads, Silver Beads, Onyx Beads, Crystal Clear Beads, Shears) appear on /catalog in a grid layout
  2. Visitor can filter the catalog by product category and results update without a full page reload
  3. Visitor can sort products by price (low-to-high, high-to-low) and latest — results update correctly
  4. Visitor can type a product name into a search field and see only matching products
**Plans**: 4 plans

Plans:
- [ ] 03-01-PLAN.md — Product type + mock data: canonical Product type, extend mock to 6 products, update homepage components
- [ ] 03-02-PLAN.md — Catalog UI components: CatalogProductCard, FilterBar, FilterDrawer, SearchInput
- [ ] 03-03-PLAN.md — CatalogClient island + /catalog page + /catalog/[slug] stub
- [ ] 03-04-PLAN.md — Supabase products table + seed + mock-to-Supabase swap in page.tsx

---

### Phase 4: Product Detail
**Goal**: A visitor on a product page has everything they need to understand the product and make a purchase decision — including variant selection, reviews, and an upsell prompt
**Depends on**: Phase 3
**Requirements**: PROD-04, PROD-05, CONV-02
**Success Criteria** (what must be TRUE):
  1. Visitor can view a scrollable image gallery on the product detail page
  2. Visitor can select a size and quantity variant — price and availability update accordingly (thread colour deferred to Phase 5: requires cart line item schema)
  3. Customer reviews (admin-entered) are visible below the product description
  4. A "starter kit" bundle suggestion (beads + shears) is displayed as an upsell on relevant product pages
**Plans**: 4 plans

Plans:
- [ ] 04-01-PLAN.md — Type extensions + Supabase reviews table DDL/seed + data fetching layer
- [ ] 04-02-PLAN.md — Page layout + image gallery (Server Component shell, breadcrumbs, product info, not-found page)
- [ ] 04-03-PLAN.md — Variant picker + Add to Cart (ProductDetailClient island: size/quantity/thread colour placeholder)
- [ ] 04-04-PLAN.md — Reviews display + upsell block + page assembly (wire Supabase data to ProductReviews and UpsellBlock)

---

### Phase 4.1: CSV Price Import (INSERTED)

**Goal**: Import real product pricing from the CSV file into Supabase — ensuring all product variants reflect accurate prices before checkout is built
**Depends on**: Phase 4
**Plans:** 2 plans

Plans:
- [ ] 04.1-01-PLAN.md — Extend ProductVariant with price_tiers + update mock data + SQL migration for Supabase
- [ ] 04.1-02-PLAN.md — Replace integer quantity stepper with pack-size tier picker in ProductDetailClient

**Details:**
CSV pricing modelled as price_tiers on each variant (qty+price pairs). Sizes 2mm/4mm start at 50-bead packs; 6mm and 24K Gold 2mm start at 25-bead packs. Shears has a single flat tier.

---

### Phase 5: Cart & Checkout
**Goal**: A visitor can add products to a cart and complete a purchase — paying in Naira via Paystack — or be directed to request an international shipping quote
**Depends on**: Phase 4
**Requirements**: CART-01, CART-02, CART-03, CART-04, CART-05, CART-06, CART-07, CART-08
**Success Criteria** (what must be TRUE):
  1. Visitor can add a product variant to the cart and see it appear in the slide-out cart drawer immediately
  2. Visitor can view the cart at /cart, adjust quantities, and remove items
  3. Visitor can complete a guest checkout (no account required) by entering name, email, and a Nigerian delivery address
  4. Checkout submits payment to Paystack in ₦ and a domestic shipping rate is included in the order total
  5. A visitor selecting international delivery sees a "contact us for a shipping quote" message in place of a rate
  6. After successful payment, visitor is redirected to an order confirmation page showing their order summary
**Plans**: 9 plans

Plans:
- [ ] 05-01-PLAN.md — Cart types, reducer, threadColours constants, CartContext + localStorage persistence, Providers wrapper
- [ ] 05-02-PLAN.md — Supabase orders/order_items schema (SQL migration) + TypeScript types
- [ ] 05-03-PLAN.md — Thread colour picker + Add to Cart wiring in ProductDetailClient
- [ ] 05-04-PLAN.md — CartDrawer component + CartLineItem + Header cart badge
- [ ] 05-05-PLAN.md — /cart page (dedicated cart page with quantity controls)
- [ ] 05-06-PLAN.md — Paystack webhook handler + middleware exclusion
- [ ] 05-07-PLAN.md — Two-step checkout: CheckoutForm, OrderReview, PaystackButton, shipping logic
- [ ] 05-08-PLAN.md — Order confirmation page: server-side fetch + OrderPoller (Realtime + 30s timeout)
- [ ] 05-09-PLAN.md — End-to-end verification checkpoint

---

### Phase 6: Admin Panel
**Goal**: The site owner (Unoma) can manage all products, orders, and customer reviews from a protected /admin interface — without touching any code
**Depends on**: Phase 5
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, CONV-03
**Success Criteria** (what must be TRUE):
  1. Admin can log in to /admin with email/password — unauthenticated visitors are redirected away
  2. Admin can create a new product, edit its name/description/price/variants, and delete it — changes appear on the storefront immediately
  3. Admin can upload product images directly in the admin panel — images are stored in Supabase Storage and visible on product pages
  4. Admin can view all orders, see their details, and update each order's status to pending, shipped, or delivered
  5. Admin can add a customer review to a product — the review appears on the product detail page
  6. Admin dashboard shows recent orders and total sales figures at a glance
**Plans**: 7 plans

Plans:
- [ ] 06-01-PLAN.md — Foundation & Auth: schema migrations, admin client, middleware guard, login/logout, admin layout shell
- [ ] 06-02-PLAN.md — Dashboard: stats panel (Today/Week/Month tabs), recent orders table
- [ ] 06-03-PLAN.md — Product list: search, category filter, archive toggle, is_active storefront filter
- [ ] 06-04-PLAN.md — Product form core: name, slug, description (Tiptap), variants inline table with price_tiers
- [ ] 06-05-PLAN.md — Product form images: drag-drop upload, Supabase Storage, dnd-kit reorder thumbnails
- [ ] 06-06-PLAN.md — Orders: list with status filter tabs, inline status dropdown, order detail view
- [ ] 06-07-PLAN.md — Reviews & Settings: add review form, business settings key-value form

---

### Phase 7: Content Pages
**Goal**: Visitors can learn about the brand, get answers to common questions, understand shipping options, and read blog content — all from purpose-built pages
**Depends on**: Phase 6
**Requirements**: CONT-02, CONT-03, CONT-04, CONT-05, CONT-06
**Success Criteria** (what must be TRUE):
  1. /about displays Unoma's story and the Twinkle Locs brand mission with appropriate imagery
  2. /faq displays common questions in an accordion layout — each item expands/collapses on click
  3. /shipping displays domestic delivery rates and timeframes, plus an explanation of the international inquiry process
  4. /blog displays a listing of published blog posts pulled from Supabase
  5. An individual blog post URL renders the full post content
**Plans**: 6 plans

Plans:
- [ ] 07-01-PLAN.md — DB types + AdminSidebar: extend supabase.ts with about_sections/faqs/blog_posts, add content nav links
- [ ] 07-02-PLAN.md — About page: /admin/pages editor (Tiptap + image upload) + public /about with sticky pill nav
- [ ] 07-03-PLAN.md — FAQ page: /admin/faqs CRUD + public /faq with grouped accordion
- [ ] 07-04-PLAN.md — Shipping page: /admin/shipping editor (settings keys) + public /shipping with zone rates + WhatsApp CTA
- [ ] 07-05-PLAN.md — Blog admin: /admin/blog CRUD with Tiptap body + image upload + published toggle
- [ ] 07-06-PLAN.md — Blog public: /blog listing with category filter + /blog/[slug] post page with share buttons + related posts

---

### Phase 8: Conversion
**Goal**: The site actively captures visitor email addresses for ongoing marketing
**Depends on**: Phase 7
**Requirements**: CONV-01
**Success Criteria** (what must be TRUE):
  1. Footer on every page contains an email input field and a subscribe button
  2. A visitor who submits their email address sees a success confirmation — the email is recorded in Supabase
**Plans**: TBD

Plans:
- [ ] 08-01: TBD

---

### Phase 9: SEO
**Goal**: Every page is discoverable by search engines — with correct metadata, structured data, a sitemap, and clean URLs throughout
**Depends on**: Phase 8
**Requirements**: SEO-01, SEO-02, SEO-03
**Success Criteria** (what must be TRUE):
  1. Every page has a unique title tag and meta description — verified in browser DevTools or a head inspector
  2. Every page has an OpenGraph image tag — link previews in WhatsApp/Twitter/Facebook render with the correct image
  3. Product pages include Schema.org Product structured data — valid when tested with Google's Rich Results Test
  4. /sitemap.xml is accessible and lists all public page URLs
**Plans**: TBD

Plans:
- [ ] 09-01: TBD

---

### Phase 10: Staging Deployment
**Goal**: The complete site is deployed to a Vercel staging URL and verified end-to-end — ready for DNS cutover to twinklelocs.com
**Depends on**: Phase 9
**Requirements**: SEO-05
**Success Criteria** (what must be TRUE):
  1. Site is accessible at a Vercel staging URL (not twinklelocs.com) without authentication gates
  2. A full purchase flow (add to cart → checkout → Paystack payment → order confirmation) completes successfully on staging
  3. Admin can log in and manage products/orders on the staging environment
  4. No console errors, broken images, or broken links on the homepage, catalog, and a product detail page
**Plans**: TBD

Plans:
- [ ] 10-01: TBD

---

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 4/4 | Complete | 2026-03-20 |
| 2. Homepage | 3/3 | Complete | 2026-03-20 |
| 3. Product Catalog | 4/4 | Complete | 2026-03-20 |
| 4. Product Detail | 4/4 | Complete | 2026-03-22 |
| 4.1. CSV Price Import (INSERTED) | 2/2 | Complete | 2026-03-23 |
| 5. Cart & Checkout | 9/9 | Complete | 2026-03-24 |
| 6. Admin Panel | 7/7 | Complete | 2026-03-26 |
| 7. Content Pages | 6/6 | Complete | 2026-03-26 |
| 8. Conversion | 0/TBD | Not started | - |
| 9. SEO | 0/TBD | Not started | - |
| 10. Staging Deployment | 0/TBD | Not started | - |

---
*Roadmap created: 2026-03-19*
*Depth: Comprehensive (8-12 phases)*
*Coverage: 35/35 v1 requirements mapped*
