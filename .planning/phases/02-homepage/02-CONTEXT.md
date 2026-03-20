# Phase 2: Homepage - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a complete, on-brand homepage at the root URL. Sections: hero, featured products, brand story, testimonials, and Instagram CTA. The homepage communicates who Twinkle Locs is and drives visitors toward the catalog. Creating products, the /about page, and cart functionality are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Hero section
- Brand colour gradient background — no photo, pure design using the afro-luxury palette
- Hero height: Claude's discretion (what looks best)
- Primary CTA: "Explore Beads" button linking to /catalog
- Secondary CTA: WhatsApp link below the main button (reinforces direct-order channel)

### Featured Products
- 4-column grid on desktop; stacked (1-col) on mobile
- Each card shows: product image, product name, price range (e.g. ₦ 2,500 – ₦ 4,000 based on bead size variant), and "Add to cart" button
- Products selected via `is_featured` boolean flag on the Supabase products table
- Clicking "Add to cart" on a homepage card opens a size picker modal (user stays on homepage, selects size/variant before adding to cart)
- Hover state on desktop: card lift with deeper shadow — no image zoom
- A prominent "Shop the Collection" button appears below the grid, linking to /catalog

### Brand story
- Text + image split layout (story text one side, photo of Unoma or product the other)
- Includes a "Read our story" link to /about (link present even though /about is built in Phase 7 — it can be a dead link or placeholder until then)

### Testimonials
- Auto-rotating carousel (one testimonial at a time)
- Each card shows: quote text, customer name, and customer photo or initials avatar
- No star ratings on testimonial cards

### Instagram CTA
- Dedicated section (not just a footer icon)
- Positioned after the testimonials section, just above the footer
- Uses brand colour background — stands out as a distinct full-width section
- Contains heading, @twinklelocs handle, and a button linking to instagram.com/twinklelocs (opens in new tab)

### Page section order
1. Hero
2. Featured Products (grid + "Shop the Collection" button)
3. Brand Story (split layout + "Read our story" link)
4. Testimonials (auto-rotating carousel)
5. Instagram CTA (brand colour background)
6. Footer (from Phase 1 layout)

### Claude's Discretion
- Hero height
- Exact gradient colours and direction (within brand palette)
- Testimonial carousel timing/transition animation
- Spacing, typography sizing, and padding throughout
- Placeholder content for brand story text and testimonial copy (real content from Unoma later)

</decisions>

<specifics>
## Specific Ideas

- Price on product cards should show as a range, not a fixed price — reflects that beads come in different sizes with different prices
- The "Add to cart" flow from the homepage uses a modal size picker, keeping the user on the homepage rather than navigating away
- Instagram section should feel like a brand moment, not an afterthought — brand colour background treatment

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-homepage*
*Context gathered: 2026-03-20*
