# Twinkle Locs

## What This Is

Twinkle Locs is a full rebuild of twinklelocs.com — a Nigerian e-commerce brand selling decorative bead accessories for locs. The new site replaces the existing WordPress/WooCommerce setup with a custom Next.js 15 storefront backed by Supabase, targeting both the Nigerian domestic market and the global diaspora. The brand's goal is to be the best loc bead store in Nigeria and worldwide.

## Core Value

A Nigerian customer on mobile can discover, customise, and buy loc beads in under 2 minutes — and a diaspora customer anywhere in the world can do the same.

## Requirements

### Validated

- [x] Admin order email notifications (idempotent + bounded retries) — validated in Phase 12

### Active

- [ ] Shopfront with full product catalog (beads by size, quantity, thread colour)
- [ ] Product detail pages with variant picker, image gallery, and customer reviews
- [ ] Cart and Paystack-powered checkout for Nigerian customers (₦)
- [ ] International shipping inquiry flow ("contact us for a quote")
- [ ] Admin panel at /admin for editing products, prices, images, blog posts, and orders — no code changes needed
- [ ] Customer accounts (register, login, order history) via Supabase Auth
- [ ] About/Founder page (Unoma's story and brand mission)
- [ ] Blog with posts stored in Supabase, editable from admin
- [ ] FAQ, Shipping Info, and Contact pages
- [ ] WhatsApp floating button on all pages
- [ ] Email capture (newsletter signup)
- [ ] Product reviews visible on product pages
- [ ] Afro-luxury + bold cultural design using Raleway, Halimun, and Inter fonts
- [ ] Mobile-first responsive design (majority of Nigerian users are on mobile)
- [ ] SEO-optimised pages (metadata, structured data, sitemap, lowercase URLs)
- [ ] Deployed to Vercel with staging environment before DNS cutover

### Out of Scope

- WooCommerce / WordPress integration — full replacement with Supabase
- Live Instagram feed embed — link to @twinklelocs only
- Multi-currency support — ₦ for domestic; international customers contact for rate
- Cash on delivery — Paystack card/bank/USSD only for v1
- Mobile app — web-first
- Real-time chat / live chat widget — WhatsApp button is sufficient for v1

## Context

- **Existing site:** twinklelocs.com (WordPress + WooCommerce, Paystack, 6 products)
- **Current catalog:** 24K Gold Beads, Gold Beads, Silver Beads, Onyx Beads, Crystal Clear Beads, Shears — with variants for size (2mm/4mm/6mm), quantity (25–200), and thread colour (5 options)
- **Brand voice:** Warm, cultural, empowering. Founder Unoma speaks directly to a Nigerian/African audience with cultural humour and relatability
- **Fonts retained from existing site:** Halimun (display/hero), Raleway (body/headings), Inter (UI elements) — all self-hosted
- **Design direction:** Afro-luxury meets bold & cultural — deep gold, rich cocoa, warm cream, forest green, terracotta
- **Payment:** Paystack (supports cards, bank transfer, USSD — standard for Nigeria)
- **Nigerian market specifics:** Most users on mobile, Paystack expected, WhatsApp inquiries common
- **Existing gaps to close:** no About page, no email capture, no WhatsApp button, no reviews, no shipping info, no FAQ, thin blog, inconsistent URLs

## Constraints

- **Tech Stack:** Next.js 15 (App Router) + TypeScript + Tailwind CSS — non-negotiable
- **Backend:** Supabase (PostgreSQL + Auth + Storage) — replacing WooCommerce
- **Payments:** Paystack — only Nigerian-compliant option for v1
- **Deployment:** Vercel — staging URL first, then DNS cutover to twinklelocs.com
- **Editing:** All content (prices, images, products, blog) must be editable via /admin without touching code
- **Images:** Stored in Supabase Storage, uploaded via admin panel
- **International shipping:** v1 = contact-for-quote flow only; automated rates are v2

## Key Decisions

| Decision | Rationale | Outcome |
|---|---|---|
| Full rebuild (not headless WP) | Cleaner codebase, full control, better performance, no WP licensing concerns | — Pending |
| Supabase over WooCommerce REST API | Start with option A (WooCommerce) was overridden — user prefers going straight to Supabase for full ownership | — Pending |
| Blog in Supabase (not WordPress) | Keeps all content in one system, editable from single admin panel | — Pending |
| International shipping = contact flow | Rate complexity for v1; automated international rates deferred to v2 | — Pending |
| Staging-first deployment | Validate full site before DNS cutover to avoid downtime on live brand | — Pending |
| Admin panel built into Next.js app | Avoids separate CMS subscription, gives custom UX tailored to the brand's needs | — Pending |

---
*Last updated: 2026-04-29 after Phase 12 completion*
