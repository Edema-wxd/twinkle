# Storefront and admin UX/UI review (Nov 2026)

A page-by-page review of the storefront and admin panel, done alongside the
content-marketing upgrade (blog and FAQ). Priorities: **P1** means broken, a
blocker or a conversion killer. **P2** is a clear UX gain. **P3** is polish.

## Deploy note

This change adds columns. Run `npx drizzle-kit push` before or right after
deploying, or the blog, FAQ and home pages will fail to query:

- `blog_posts`: `seo_title`, `seo_description`, `is_featured`, `featured_product_ids`
- `faqs`: `is_featured`
- `blog_posts.previous_slugs` (added in the blog review below)

Also set `ADMIN_EMAILS` (comma-separated) in production. See the security note below.

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

## Blog review, end to end (tested live)

This was tested in a real browser against a throwaway in-memory Postgres. The test covered: log in, write a post with a table, save the draft, Cmd+S, the leave-page warning, restore after reload, import a `.md` file with images, paste Markdown, publish, view on desktop and iPhone, rename the slug, check the old link redirects, and delete.

### Security (fixed)
- **[P1] Anyone could become an admin.** Email sign-up was open, and every admin check only asked "is anyone logged in?". A stranger signed up and created a post (201) in the test. Sign-up now works only for the first account (first-run setup) or for emails in `ADMIN_EMAILS`. When `ADMIN_EMAILS` is set, it is also enforced on every admin request, which locks out any accounts created earlier. **Set it in production and check the `user` table for accounts you don't recognise.**
- **[P1] Post HTML was stored raw.** The admin preview rendered it unsanitised, which allowed stored XSS. Post bodies are now sanitised when saved and when loaded into the editor.
- **[P1, likely] Uploads were blocked by the CSP.** The browser uploads files straight to `*.ingest.uploadthing.com`, which `connect-src` didn't allow, so cover and inline uploads probably failed in production. That host is now allowed. Confirm with one upload after deploying.

### Writing and editor (fixed)
- **[P1]** Saving remounted the form, losing text typed during the save, the toast, preview mode, undo history and scroll position. The form no longer remounts.
- **[P2]** Saving a new post twice could create a duplicate. After the first save, the form switches to updating and fixes the URL in place.
- **[P2]** In-app links now ask before leaving with unsaved changes. Unsaved work is also backed up in the browser and can be restored.
- **[P2]** The sticky formatting toolbar never stuck. It now sits under the action bar.
- **[P2]** Failed image uploads were silent. They now show an error. Images can be pasted or dragged in, several at once, and alt text can be edited later.
- **[P2]** The "Shop the look" picker listed archived products and kept deleted ones. It now shows only active products and drops missing ones.
- **[P2]** A future publish date looked scheduled but published immediately. Future dates are now blocked (scheduling isn't supported). The date can also be set on drafts.
- **[P2]** A draft marked "featured" emptied the hero slot. It now only takes the slot once published.
- **[P2]** Changing a live post's slug broke shared links. Old slugs now 308-redirect to the new address.
- **[P3]** Smaller fixes:
  - Malformed post IDs return 404 instead of 500.
  - Field lengths are capped.
  - Lagos time zone is used for dates.
  - Link insertion now works with no selected text, and `catalog/x` becomes an internal link.
  - The drop cap no longer applies to the placeholder.
  - The "View" link is shown on mobile.
  - The save button now reads "Update live post".
- Inline images are cleaned up from UploadThing when they're removed from a post or the post is deleted, unless another post uses them.

### New: Markdown and tables
- **Tables:** insert from the toolbar or from Markdown. There are row, column, header and merge controls. Tables are styled on the site and scroll sideways on phones.
- **Markdown:**
  - Paste it, drop a `.md` file into the editor, or use **Import Markdown**. You can choose to replace the post or add to the end.
  - Front matter fills title, teaser, category, slug, cover and SEO fields.
  - Local images are matched by file name and uploaded. Remote images are copied into storage by `/api/admin/blog/import-image`.
  - Links to twinklelocs.com become internal links.
  - Every import note is listed in a panel above the editor.
- See `docs/BLOG-GUIDE.md` for the writer's guide.

### Reading (fixed)
- Inline images are now served through `/_next/image` with `srcset`, instead of multi-MB originals.
- `?category=` only accepts real categories (case-insensitive), so a crafted link can't set the page heading.
- The native share sheet is available on phones.
- JSON-LD now has an image fallback.
- The `<article>` now covers just the post.

### Blog: still open
- No scheduled publishing, revision history or "stage changes on a live post".
- No image captions (the sanitizer already allows `figure`/`figcaption`).
- `/blog` loads every post body to work out reading time. Store a word count column once there are 100+ posts.
- ~~`middleware.ts` never runs~~ **Fixed:** it is now at `src/middleware.ts`. The setup path is exempted, there's no login redirect loop on stale cookies, lowercasing applies to pages only (not files or APIs), and login returns you to `?next=`.

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
