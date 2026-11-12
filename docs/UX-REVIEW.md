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
- `orders.amount_paid`, `orders.payment_issue` (payment verification, below)
- new table `product_stock` (stock counts, below)

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

## Payment amount verification (fixed)
- **[P1] The browser decided what customers paid.** The webhook and the verify route built orders from the subtotal, shipping and unit prices in the Paystack metadata, which the browser writes, and never checked the amount Paystack charged. A tampered checkout could buy ₦30,000 of beads for ₦100.
- **Now:** `src/lib/payments/paidOrder.ts` re-prices every paid order on the server, then compares the result with the amount Paystack actually charged (in NGN). It uses:
  - the product's variant and pack-size tier
  - shipping from `quoteShipping()`
  - the promo code, re-validated
- **Recording:** orders are always saved with the server's numbers. If the charge is short, a pack size or product doesn't exist, the quantity is out of range, or the promo is invalid, the order is saved as **`payment_review`** with a plain-English `payment_issue`. The admin email is marked "CHECK PAYMENT before shipping", the order page shows a "don't ship yet" banner, and there's a "Needs review" tab. The customer sees "we need to double-check a detail" and gets no automatic confirmation. Setting the order to **paid** sends that confirmation.
- **Also fixed:**
  - The webhook ignored promo discounts and never counted promo use.
  - The verify route could set a shipped order back to `paid`.
  - The webhook and verify route racing could fail with a duplicate insert. Recording is now idempotent, with `onConflictDoNothing`.
- **Tested:** signed webhook charges covering honest payments, tampered prices, shipping, promo codes, pack size and quantity, an unknown product, overpayment, concurrent duplicates, a replay after shipping, a bad signature, and clearing a flagged order.

## Stock check at payment (fixed)
- **Before:** stock was only checked when adding to the bag. A bag saved in the browser could still pay for items that had since sold out or been archived, at stale prices.
- **Now, before payment:** `/api/checkout/check-cart` runs the same pricing as the payment webhook (`priceOrder()`), plus availability per line. The checkout review step calls it when it opens and again the moment Pay is tapped. Then:
  - Sold-out or archived items show a banner with **Remove** buttons, and Pay stays disabled.
  - Stale prices are updated in the bag, with a notice.
  - Paystack only opens if the bag is exactly what the server would charge.
- **Now, at payment:** if an item sells out between that check and the charge, the webhook marks the order `payment_review` ("marked sold out") instead of `paid`.
- **Stock counts (added):** each size can have a count in the new `product_stock` table, in beads (or items for Tools), where a pack of 100 uses 100. Blank means not tracked, and the In Stock tick decides.
  - **Shop pages:** catalog, product, home and related products overlay live counts. A size shows as sold out when fewer beads than the smallest pack remain, pack sizes bigger than what's left are disabled, and an "Only N beads left" note appears when stock is low.
  - **Checkout:** `check-cart` adds a `low_stock` status. Lines of the same size share one count, and the review step offers **Reduce to N**.
  - **Payment:** `recordPaidOrder()` takes stock with one conditional `UPDATE … WHERE units >= need` per size, so two simultaneous orders can't both take the last units. The loser is held as `payment_review` with an explanation. Only the winning insert takes stock, so retries never double-count, and the affected shop pages are revalidated.
  - **Admin:** a Stock column in the product editor, and stock per size in the products list. Saving only writes counts the admin changed, so a form left open can't undo an order's decrement.
  - **Not automatic:** refunded or cancelled orders don't return stock. Adjust the count by hand.

## Email and Resend wiring (fixed)
- **[P1]** Status emails from the admin (processing, shipped, delivered) were started without awaiting them, so Vercel could freeze them mid-send. They now run in `after()`.
- **[P1]** No idempotency, so a Paystack retry could email twice. Automatic sends now carry idempotency keys.
- **[P2]** "Reply to this email" went to the unmonitored sending address. There's now a reply-to (`EMAIL_REPLY_TO`), and the new-order alert replies to the customer.
- **[P2]** The email log insert wasn't awaited, so logs could be lost on serverless. The new-order alert wasn't logged at all.
- **[P2]** The template preview had its own copy of the HTML and had drifted from real sends (escaping, layout). Both now use `src/lib/email/orderTemplate.ts`.
- **[P2]** Template text wasn't escaped and line breaks were lost. `{ref}` only replaced once. Now `{name}`, `{ref}`, `{total}` and `{tracking}` all work, and blank lines make paragraphs.
- **[P2]** There was no delivery feedback. A signed `/api/webhooks/resend` now records delivered, opened, clicked, delayed, bounced, complained and failed events. Problems are never overwritten by a later "opened".
- **[P3]** The footer said 2025, and emails were off-brand. They now use the dynamic year and the forest and gold brand, and link to the order page.
- **New:** an admin Email setup panel (key, sender, Resend domain verification, reply-to, alert recipient, tracking on or off), a **Send test email** button, delivery badges and a **Needs attention** filter.
- **Not built:** the newsletter signup only stores subscribers. Nothing emails them yet, and they aren't synced to a Resend audience.

## Still open (not changed, needs a decision or a follow-up)

1. ~~**[P1] Shipping prices disagree across the site.**~~ **Fixed:** `src/lib/checkout/shippingInfo.ts` is now the single source of truth. Checkout, `/shipping` (now a full zone table), the home and shipping meta descriptions, `/llms.txt` and the order confirmation all read it. The no-op "Lagos flat rate" admin fields were removed, and the dead `getShippingCost()` (₦6,000 / ₦9,500) was deleted.
2. ~~**[P1] `/catalog` and `/catalog/[slug]` have no error handling around their DB queries.**~~ **Fixed:** branded error pages (`src/app/error.tsx`, a shop-specific `src/app/catalog/error.tsx` with Try again and Order on WhatsApp, an admin one that keeps the sidebar, and `global-error.tsx`), plus loading skeletons for the shop and product pages. Queries still throw rather than return empty lists on purpose: product pages render on every visit, so they show the error page, and the static `/catalog` keeps serving its last good version when a refresh fails. A degraded page is never cached. The build still fails if the database is unreachable at build time, which is intended: Vercel then keeps the current live site instead of publishing an empty shop. The blog says "Stories didn't load" during an outage instead of "coming soon".
3. ~~**[P2] Checkout form.**~~ **Fixed:**
   - Inputs are 16px (no iOS zoom) and at least 48px tall.
   - Autofill attributes on every field (`given-name`, `email`, `tel`, `street-address`, `address-level1/2`).
   - Errors are linked with `aria-invalid`/`aria-describedby`, a count appears at the top, focus goes to the first problem, and each message clears as it's fixed. Email and phone checks are stricter (a real email shape, 10 to 14 digits).
   - Step 1 has a collapsible "Your bag" summary with the subtotal.
   - The "primarily deliver within Lagos" copy was already gone. The dead international branch in `checkout/page.tsx` was removed; "Outside Nigeria" shows the WhatsApp quote inside the form.
4. ~~**[P2] Order confirmation.**~~ **Fixed:**
   - The waiting screen says "Confirming your payment…" (announced to screen readers), keeps checking for 5 minutes instead of giving up after 30 seconds, and never claims success before the order exists.
   - The headline, icon and a progress tracker (Confirmed, Preparing, On its way, Delivered) follow the order's status. The tracking number shows once shipped, and promo discounts get their own line.
   - Delivery estimates come from the shipping settings. "Pack of 1" is hidden for tools.
   - **[P1, found while fixing]** The page sent the whole Paystack record to the browser (card bank and last 4 digits, IP address) plus the customer's email and phone. `src/lib/orders/publicOrder.ts` now sends only what the page shows, with a test guarding it, and the page is `noindex`.
5. ~~**[P2] Product page.**~~ **Fixed:**
   - Size, pack, thread colour and Add to cart now come straight after the price; the description moved below them ("About these beads"). On an iPhone 13 the Add to cart button moved from 1,634px to 1,008px down the page, and on desktop the whole buying flow fits on the first screen.
   - Phones get a slim sticky bar (price + "Add to cart", or "Choose colour", which jumps to the picker) while the buying block is off screen. It hides near the footer and when sold out.
   - A star summary under the title links to the reviews, which now open with an average, a 5-to-1 breakdown, stars screen readers read as "Rated 4.5 out of 5", and a note that buyers get a review link by email after delivery (reviews are tied to orders).
   - The shears upsell is a one-tap "Complete the kit · Add" row under Add to cart, replacing the card at the bottom of the page.
   - The floating WhatsApp button is hidden on product pages on phones (it covered the buy controls); "Ask us on WhatsApp" sits under Add to cart.
6. ~~**[P2] Cart line items** show the unit price instead of the line total, and pressing "−" at 1 removes the item with no undo.~~ **Fixed:** lines show their total (plus "each" when the quantity is more than 1), "−" is disabled at 1, and Remove shows "Removed … Undo", which puts the item back in place (also from an empty cart and in the drawer). "Pack of 1" is hidden for tools.
7. ~~**[P2] Admin.**~~ **Fixed:**
   - Deleting a testimonial asks "Delete for good?" first, and only removes it once the server confirms. Add, edit, delete and loading failures now show a red message instead of failing silently.
   - The dashboard's Today / This week (from Monday) / This month use Lagos time (`src/lib/time/lagos.ts`, tested). Before, an order at 00:30 Lagos time counted as the previous day. Dates across the admin, blog and reviews are also shown in Lagos time.
   - No more `alert()`: order status errors show under the dropdown (which resets) with a "Saved" note on success, and product show/hide errors show a banner above the list.
   - Abandoned checkouts have their own page in the sidebar (Abandoned Orders); the Orders page shows a "N abandoned checkouts · View" card.
   - The shopping cart drawer is no longer mounted on admin pages.
8. ~~**[P3]** "Onyx" copy, WhatsApp greens, no returns or privacy page.~~ **Fixed:**
   - "Onyx" removed from the shop and home page descriptions and llms.txt (there's no Onyx category).
   - WhatsApp colours are tokens in `globals.css`: bright `whatsapp` for the icon-only button, `whatsapp-dark` for buttons with text (white on the bright green was about 2:1 contrast; now 7.6:1).
   - **Draft** `/returns` and `/privacy` pages (owner to confirm the policy terms), linked from the footer, the sitemap, llms.txt and under the checkout button.
   - **[P2, found while fixing]** Admin "Message on WhatsApp" links for customers were `wa.me/234` + the number as typed, so 0803... became 23408..., which WhatsApp rejects. `customerWhatsAppUrl()` (tested) builds a working link.
9. ~~**[P3]** Images inserted inside blog posts aren't deleted from UploadThing when the post is deleted.~~ **Fixed:** deleting a post removes its cover and body images, and files are only deleted once nothing else on the site uses them.
