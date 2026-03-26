# Requirements: Twinkle Locs

**Defined:** 2026-03-19
**Core Value:** A Nigerian customer on mobile can discover, customise, and buy loc beads in under 2 minutes — and a diaspora customer anywhere in the world can do the same.

## v1 Requirements

### Foundation

- [x] **FOUND-01**: Project scaffolded with Next.js 15 (App Router), TypeScript, Tailwind CSS, and folder structure
- [x] **FOUND-02**: Design tokens configured — Afro-luxury colour palette (deep gold, cocoa, cream, forest green, terracotta), Halimun/Raleway/Inter fonts self-hosted
- [x] **FOUND-03**: Shared layout components built — header, footer, mobile navigation drawer
- [x] **FOUND-04**: WhatsApp floating button rendered on every page
- [ ] **FOUND-05**: Supabase project configured — PostgreSQL schema, Storage buckets for images, Auth for admin, typed API client

### Products

- [ ] **PROD-01**: Visitor can browse all products on a catalog page with grid layout
- [ ] **PROD-02**: Visitor can filter products by category and sort by price (low/high) and latest
- [ ] **PROD-03**: Visitor can search for products by name and see matching results
- [ ] **PROD-04**: Visitor can view a product detail page with image gallery, description, and variant picker (size, quantity, thread colour)
- [ ] **PROD-05**: Visitor can see customer reviews on the product detail page

### Cart & Checkout

- [x] **CART-01**: Visitor can add a product variant to the cart
- [x] **CART-02**: Visitor can view and edit the cart in a slide-out drawer
- [x] **CART-03**: Visitor can view and edit the cart on a dedicated /cart page
- [x] **CART-04**: Visitor can complete a guest checkout (no account required) entering name, email, and delivery address
- [x] **CART-05**: Checkout processes payment via Paystack in Nigerian Naira (₦)
- [x] **CART-06**: Nigerian domestic shipping rate is calculated at checkout
- [x] **CART-07**: Visitor selecting international delivery is directed to a "contact us for a shipping quote" flow
- [x] **CART-08**: Visitor sees an order confirmation page after successful payment with order summary

### Admin Panel

- [x] **ADMIN-01**: Admin can log in to a protected /admin panel with email/password
- [x] **ADMIN-02**: Admin can create, edit, and delete products including name, description, price, and variants
- [x] **ADMIN-03**: Admin can upload and manage product images stored in Supabase Storage
- [x] **ADMIN-04**: Admin can view all orders and update their status (pending / shipped / delivered)
- [x] **ADMIN-05**: Admin can view a dashboard showing recent orders and total sales figures

### Content Pages

- [x] **CONT-01**: Homepage displays hero section with CTA, featured products, brand story, testimonials, and link to Instagram
- [ ] **CONT-02**: About/Founder page tells Unoma's story and the brand mission
- [ ] **CONT-03**: FAQ page presents common questions in an accordion layout
- [ ] **CONT-04**: Shipping Info page details domestic delivery rates and timeframes, and explains the international inquiry process
- [ ] **CONT-05**: Blog listing page displays published posts from Supabase
- [ ] **CONT-06**: Individual blog post page renders full post content

### Conversion

- [ ] **CONV-01**: Visitor can submit their email address for the newsletter from the footer
- [ ] **CONV-02**: Product detail page displays a "starter kit" bundle suggestion (beads + shears) as an upsell
- [x] **CONV-03**: Admin can add customer reviews to products via the admin panel (no self-service reviews in v1)

### SEO & Performance

- [ ] **SEO-01**: Every page has unique title, meta description, and OpenGraph image
- [ ] **SEO-02**: Product pages include Schema.org Product structured data for Google Shopping
- [ ] **SEO-03**: XML sitemap is auto-generated and accessible at /sitemap.xml
- [x] **SEO-04**: All URLs use lowercase slugs (no capitalisation)
- [ ] **SEO-05**: Site is deployed to Vercel with a staging URL before DNS cutover to twinklelocs.com

---

## v2 Requirements

### Customer Accounts
- **ACC-01**: Customer can register and log in with email/password
- **ACC-02**: Customer can view order history
- **ACC-03**: Customer can save delivery addresses
- **ACC-04**: Customer can reset password via email link

### Commerce
- **CART-V2-01**: Admin can create discount/promo codes redeemable at checkout
- **CART-V2-02**: International shipping rates auto-calculated (no manual inquiry)

### Admin
- **ADMIN-V2-01**: Blog post editor in admin panel (rich text, image upload, publish/draft)

### Products
- **PROD-V2-01**: Admin can mark products as featured for homepage carousel

### Conversion
- **CONV-V2-01**: Email capture popup/banner (in addition to footer form)
- **CONV-V2-02**: Self-service customer reviews (verified purchase only)

---

## Out of Scope

| Feature | Reason |
|---|---|
| WordPress / WooCommerce integration | Full replacement — no WP dependency in new stack |
| Live Instagram feed embed | API complexity not worth it; link to @twinklelocs is sufficient |
| Multi-currency (USD, GBP, etc.) | ₦ for domestic; diaspora customers contact for rate — v1 |
| Cash on delivery | Paystack handles all payments; COD adds fulfilment complexity |
| Mobile app (iOS/Android) | Web-first strategy; app deferred |
| Real-time chat / live chat widget | WhatsApp floating button is the preferred channel |
| OAuth / social login | Email/password sufficient for admin; no customer accounts in v1 |

---

## Traceability

| Requirement | Phase | Status |
|---|---|---|
| FOUND-01 | Phase 1 | Pending |
| FOUND-02 | Phase 1 | Pending |
| FOUND-03 | Phase 1 | Pending |
| FOUND-04 | Phase 1 | Pending |
| FOUND-05 | Phase 1 | Pending |
| PROD-01 | Phase 3 | Pending |
| PROD-02 | Phase 3 | Pending |
| PROD-03 | Phase 3 | Pending |
| PROD-04 | Phase 4 | Complete |
| PROD-05 | Phase 4 | Complete |
| CART-01 | Phase 5 | Pending |
| CART-02 | Phase 5 | Pending |
| CART-03 | Phase 5 | Pending |
| CART-04 | Phase 5 | Pending |
| CART-05 | Phase 5 | Pending |
| CART-06 | Phase 5 | Pending |
| CART-07 | Phase 5 | Pending |
| CART-08 | Phase 5 | Pending |
| ADMIN-01 | Phase 6 | Complete |
| ADMIN-02 | Phase 6 | Complete |
| ADMIN-03 | Phase 6 | Complete |
| ADMIN-04 | Phase 6 | Complete |
| ADMIN-05 | Phase 6 | Complete |
| CONT-01 | Phase 2 | Pending |
| CONT-02 | Phase 7 | Pending |
| CONT-03 | Phase 7 | Pending |
| CONT-04 | Phase 7 | Pending |
| CONT-05 | Phase 7 | Pending |
| CONT-06 | Phase 7 | Pending |
| CONV-01 | Phase 8 | Pending |
| CONV-02 | Phase 4 | Complete |
| CONV-03 | Phase 6 | Complete |
| SEO-01 | Phase 9 | Pending |
| SEO-02 | Phase 9 | Pending |
| SEO-03 | Phase 9 | Pending |
| SEO-04 | Phase 1 | Pending |
| SEO-05 | Phase 10 | Pending |

**Coverage:**
- v1 requirements: 35 total
- Mapped to phases: 35
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-19 after initial definition*
