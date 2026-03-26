# Phase 7: Content Pages - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Purpose-built informational pages: /about (brand + founder story), /faq, /shipping, /blog listing, and individual blog post pages. Visitors read content; the site owner (Unoma) can manage most content from the admin panel without code changes. Transactional features (cart, checkout) and SEO metadata are separate phases.

</domain>

<decisions>
## Implementation Decisions

### About page — structure
- Sectioned layout with a sticky pill nav at the top (anchor links to each section)
- Active section highlighted in the nav as user scrolls
- Four sections: Founder Story, Brand Mission, Why Loc Beads, Contact / CTA
- Contact / CTA section at the bottom: Claude's discretion on channel (WhatsApp is consistent with the site-wide pattern)

### About page — content management
- Content editable from a dedicated /admin/pages route (not the existing Settings page)
- Each section has Tiptap rich-text editor (same as product descriptions — bold, italic, headings, links)
- Images (founder portrait + product/lifestyle imagery) uploaded via admin and stored in Supabase Storage
- SEO metadata (title, OG tags) deferred to Phase 9

### About page — imagery
- Both founder portrait (in the Founder Story section) and product/lifestyle imagery (elsewhere on the page)
- Uploaded and managed via admin panel

### FAQ
- Questions grouped by category (e.g. Shipping, Products, Care)
- Admin-managed: FAQs stored in Supabase — Unoma can add/edit/delete from admin without code changes
- Plain text answers only (no rich-text editor needed for FAQ)
- Classic accordion: one item open at a time; opening one closes the previous

### Blog
- Post fields: title, body (rich text), featured image, category/tag, excerpt
- Listing page layout: Claude's discretion — choose based on the afro-luxury brand aesthetic
- Category filter tabs on the /blog listing page
- Individual post pages include: share buttons (WhatsApp + Twitter/X) + related posts from the same category (3 posts) below the content

### Shipping page
- Display format: Claude's discretion — choose the clearest presentation of Lagos ₦3,000 / Other states ₦4,500
- Delivery timeframes shown alongside rates (e.g. Lagos: 1–2 days / Other states: 3–5 days)
- International shipping: WhatsApp CTA button ("Request a shipping quote") with pre-filled message
- Content editable from admin panel (rates, timeframes, copy stored in Supabase)

### Claude's Discretion
- Contact / CTA channel on /about (WhatsApp expected given brand pattern)
- /blog listing layout (card grid or editorial — match afro-luxury brand aesthetic)
- /shipping rate display format (table, zone breakdown, etc.)
- Exact nav highlight animation on the sticky pill nav

</decisions>

<specifics>
## Specific Ideas

- The /about sticky pill nav should feel premium — consistent with the overall afro-luxury brand feel
- FAQ admin should follow the same admin form pattern established in Phase 6 (Server Component page fetches, passes to 'use client' form)
- Blog categories should be a freeform tag on each post — no separate categories table needed
- Shipping page should clearly explain the international inquiry process (not just domestic rates)

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-content-pages*
*Context gathered: 2026-03-26*
