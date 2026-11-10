# Storefront and admin UX/UI review (Nov 2026)

A page-by-page review of the storefront and admin panel, done alongside the
content-marketing upgrade (blog and FAQ). Priorities: **P1** means broken, a
blocker or a conversion killer. **P2** is a clear UX gain. **P3** is polish.

## Deploy note

This change adds columns. Run `npx drizzle-kit push` before or right after
deploying, or the blog, FAQ and home pages will fail to query:

- `blog_posts`: `seo_title`, `seo_description`, `is_featured`, `featured_product_ids`
- `faqs`: `is_featured`

## Design tokens added

The brand gold `#927750` measures 3.2:1 on cream and 2.9:1 on forest, so it
fails WCAG AA for text. It is still fine for fills, rules and borders. For
text, use:

| Token | Hex | Use | Contrast |
|---|---|---|---|
| `gold-light` | `#C9A96E` | text/buttons on forest | 5.4:1 on forest |
| `gold-deep` | `#6F5A39` | text on cream/white | 5.0:1 on cream |

Long-form content uses the shared `.tl-prose` styles in `globals.css`. The
admin preview uses them too, so the preview matches the live page.

## Fixed in this pass

### Checkout and cart
- [P1] Refreshing or opening `/checkout` directly bounced the customer to `/cart`. The redirect ran before the saved cart loaded. The cart now has a `hydrated` flag.
- [P1] After payment, clearing the cart triggered the empty-cart redirect, which raced the push to `/orders/...`. It is now guarded.
- [P1] A failed shipping lookup set the shipping cost to ₦0 and enabled Pay. Pay now stays disabled, with a "Try again" button.
- [P1] A closed Paystack popup reused the same transaction reference. A new reference is generated after each close.
- [P2] The Pay button had no protection against double taps. It now shows a loading state and a "Secured by Paystack" line.
- [P2] The cart page flashed "empty" on load. It now shows a skeleton until the cart loads. Quantity buttons are 40px.

### Home
- [P1] The page crashed when there were no testimonials. This also happened on any DB error, because the fallback is an empty list.
- [P1] The testimonial carousel never paused. It now pauses on hover or focus, has a pause button, and respects reduced motion.
- [P1] Product cards didn't link to the product page. The whole card now links there, with a separate "Quick add" button.
- [P2] Gold-on-forest headlines and CTAs failed contrast. They now use `gold-light`.
- [P2] The brand-story placeholder box is now a styled founder quote panel. Swap it for a photo when one exists.
- [P2] Added a "Good to know" section (starred FAQs) and a "From the journal" section (latest posts).
- [P2] The featured products section is hidden when no products are featured.

### Catalog and product
- [P1] Archived products could still be bought by direct link, and showed in related products and the upsell. All three now check `isActive`.
- [P1] When every size was out of stock, the first one was preselected and Add to Cart still worked. The page now shows "Sold out" with a WhatsApp "notify me" link.
- [P1] Search ignored the category filter, and a search with no results quietly showed every product. Both filters now apply together, with an empty state and a "Clear filters" button.
- [P2] Changing size cleared the chosen thread colour. It now keeps it.
- [P2] A red "Required" badge showed before the customer had touched anything. It is gone.
- [P2] Thread swatches are 40px, and size, pack and thread buttons announce which one is selected.
- [P2] Product names used classes that don't exist (`font-halimun` and `font-mistrully`), with one span per letter. They now use plain `font-heading`.
- [P2] The grid now shows 2 columns on mobile.
- [P2] On mobile, filters no longer close after every tap. The drawer has a close button and a "Show N products" button.
- [P2] Added trust lines under Add to Cart, and the price now uses the accessible gold.

### Global
- [P1] On mobile, the header now has a cart button with an item count.
- [P1] Closed drawers stayed in the tab order. Now they're removed from it, open drawers keep focus inside, and focus goes back to the trigger on close (`useDialogFocus`).
- [P1] Added a default keyboard focus ring and a "Skip to content" link.
- [P2] Pages wrapped their content in a second `<main>`. They now use `<div>`.
- [P2] The floating WhatsApp button is hidden on checkout, so it no longer covers the Pay button. Drawers and modals now sit above it.
- [P2] The 404 page is branded, with links to the shop and WhatsApp.
- [P2] The newsletter form has proper labels, autocomplete and 44px targets.
- [P2] The footer has a support email, a Paystack trust line and better contrast.
- [P2] The About section nav covered the sticky header and caused sideways scrolling at 375px. It also had an id mismatch (`why-twinkles` vs `why-loc-beads`). It now builds from the real sections.
- [P2] Review stars show a visible focus state and are larger targets.
- [P2] Admin buttons used an off-brand `hover:bg-yellow-600`. They now use `gold-deep`.

## Still open (not changed, needs a decision or a follow-up)

1. **[P1] Shipping prices disagree across the site.** The `/shipping` page shows one flat Lagos rate. Checkout uses seven Lagos zones (₦3,000 to ₦13,500). Meta descriptions say ₦6,000 and ₦9,500. The order page says "3 to 5 days Lagos". Unoma needs to confirm the real prices and times, and then they should come from one source (`shippingZones.ts` plus settings).
2. **[P1] `/catalog` and `/catalog/[slug]` have no error handling around their DB queries.** A DB outage shows Next's default error screen, and the production build fails if the DB can't be reached. Add `try/catch` plus branded `error.tsx` and `loading.tsx`.
3. **[P2] Checkout form.**
   - Inputs are text-sm, so iOS zooms in on focus. They should be 16px.
   - There are no `autocomplete` attributes.
   - Errors aren't linked to their fields with `aria-describedby`/`aria-invalid`.
   - Step 1 has no order summary.
   - "We primarily deliver within Lagos" contradicts the nationwide promise.
   - The international branch in `checkout/page.tsx` can never run.
4. **[P2] Order confirmation.**
   - It always says "Payment successful", even while still checking.
   - It shows the raw order status.
   - Its delivery times are hardcoded.
   - The poller has no `role="status"`.
5. **[P2] Product page.**
   - The long description sits above the pickers, so the CTA falls below the fold on mobile.
   - Reviews have no summary, no accessible star text, and no link to write one.
   - The shears upsell sits far from the CTA.
6. **[P2] Cart line items** show the unit price instead of the line total, and pressing "−" at 1 removes the item with no undo.
7. **[P2] Admin.**
   - Deleting a testimonial has no confirmation and ignores failures.
   - Dashboard "today/week" uses server UTC, not Africa/Lagos.
   - `alert()` is used in orders and products.
   - There's no Abandoned Orders nav entry.
   - `CartDrawer` is mounted on admin pages.
8. **[P3]** Copy mentions "onyx" but there's no Onyx category. The WhatsApp greens differ between buttons. There is no returns or privacy page in the footer.
9. **[P3]** Images inserted inside blog posts aren't deleted from UploadThing when the post is deleted (cover images are).
