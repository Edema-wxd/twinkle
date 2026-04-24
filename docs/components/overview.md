<!-- generated-by: gsd-doc-writer -->
# Frontend Components Overview

All React components live under `src/components/`. They are organized into subdirectories by feature domain. Every component is a TypeScript `.tsx` file; client-interactive components are marked with `'use client'` at the top.

---

## Directory map

```
src/components/
├── WhatsAppButton.tsx        # Global floating WhatsApp CTA
├── providers.tsx             # Root React context providers
├── about/
│   ├── AboutSection.tsx
│   └── AboutStickyNav.tsx
├── blog/
│   ├── BlogCategoryFilter.tsx
│   ├── BlogPostCard.tsx
│   └── BlogShareButtons.tsx
├── cart/
│   ├── CartDrawer.tsx
│   └── CartLineItem.tsx
├── catalog/
│   ├── CatalogClient.tsx
│   ├── CatalogProductCard.tsx
│   ├── FilterBar.tsx
│   ├── FilterDrawer.tsx
│   └── SearchInput.tsx
├── checkout/
│   ├── CheckoutForm.tsx
│   ├── OrderReview.tsx
│   └── PaystackButton.tsx
├── faq/
│   └── FaqAccordion.tsx
├── home/
│   ├── AddToCartModal.tsx
│   ├── BrandStorySection.tsx
│   ├── FeaturedProductsSection.tsx
│   ├── HeroSection.tsx
│   ├── InstagramCTASection.tsx
│   ├── ProductCard.tsx
│   └── TestimonialsSection.tsx
├── layout/
│   ├── Footer.tsx
│   ├── Header.tsx
│   ├── MobileDrawer.tsx
│   ├── NewsletterForm.tsx
│   └── StorefrontChrome.tsx
└── product/
    ├── ProductDetailClient.tsx
    ├── ProductImageGallery.tsx
    ├── ProductReviews.tsx
    ├── RelatedProducts.tsx
    └── UpsellBlock.tsx
```

---

## `providers.tsx`

Root provider wrapper rendered inside the Next.js root layout. Composes `CartProvider` (from `@/lib/cart/CartContext`) with `CartDrawer` so both the cart state and the slide-in drawer are always mounted at the application boundary.

```tsx
<Providers>
  {children}   // wraps entire app — CartDrawer is always in the DOM
</Providers>
```

**Props:** `children: React.ReactNode`

---

## `WhatsAppButton`

A fixed-position floating button rendered on every storefront page (injected by `StorefrontChrome`). Links to the business WhatsApp number with a pre-filled greeting pulled from `BUSINESS.whatsapp.url()` in `@/lib/config/business`. No props.

---

## `about/`

Components for the `/about` page.

### `AboutSection`

Renders a single content section from the CMS (`AboutSection` Supabase type). Displays a heading, an optional image, and rich HTML body content via `dangerouslySetInnerHTML`. When the section `id` is `'contact'`, an additional WhatsApp chat button is appended below the body.

| Prop | Type | Description |
|------|------|-------------|
| `section` | `AboutSectionType` | Single row from the `about_sections` Supabase table |

### `AboutStickyNav`

Client component. A sticky pill-button navigation bar that highlights the active about-page section using `IntersectionObserver`. Clicking a pill smooth-scrolls to the matching section id. Hardcoded sections: `founder-story`, `brand-mission`, `why-loc-beads`, `contact`. No props.

---

## `blog/`

Components for the `/blog` index and individual post pages.

### `BlogPostCard`

Server-renderable card linking to a single blog post. Displays a featured image (with a gold placeholder fallback), a tag badge, title, excerpt, and formatted publish date. Accepts a partial `blog_posts` row from the Supabase generated types.

| Prop | Type | Description |
|------|------|-------------|
| `post` | Pick of `Tables<'blog_posts'>` | Fields: `id`, `title`, `slug`, `excerpt`, `featured_image`, `tag`, `published_at` |

### `BlogCategoryFilter`

Client component. Renders pill buttons for each tag. Updates the `?category=` query parameter via `router.push` without a full page reload, enabling server-side tag filtering on the blog index.

| Prop | Type | Description |
|------|------|-------------|
| `tags` | `string[]` | Unique tags to render as filter pills |
| `activeTag` | `string \| null` | Currently active tag (null = "All") |

### `BlogShareButtons`

Client component. Displays WhatsApp and X/Twitter share links for a blog post. Constructs share URLs from `title` and `canonicalUrl`.

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Post title, used in the share text |
| `canonicalUrl` | `string` | Full URL of the post, appended to the share link |

---

## `cart/`

Components for the slide-in shopping cart drawer.

### `CartDrawer`

Client component. A full-height slide-in panel (`role="dialog"`) that emerges from the right edge of the screen. Reads cart state from `useCart()`. Handles Escape-key and backdrop clicks to close. Shows an empty-state illustration when the cart is empty; otherwise renders `CartLineItem` rows. Footer shows subtotal in NGN and a checkout link (`/checkout`).

No props — driven entirely by `CartContext`.

### `CartLineItem`

Client component. A single row within `CartDrawer`. Displays a product thumbnail, name, variant name, pack quantity, thread colour swatch (non-tool products only), and unit price. Provides `−`/`+` quantity controls (maximum quantity: 10) and a "Remove" button.

| Prop | Type | Description |
|------|------|-------------|
| `item` | `CartItem` | Cart item from `@/lib/cart/types` |
| `lineKey` | `string` | Unique key from `lineKey(item)` used to identify the line |
| `onUpdateQty` | `(key: string, qty: number) => void` | Called when quantity changes |
| `onRemove` | `(key: string) => void` | Called when the remove button is clicked |

Also re-exports `lineKey` from `@/lib/cart/cartReducer` for convenience.

---

## `catalog/`

Components for the `/catalog` product listing page.

### `CatalogClient`

Client component. The interactive shell for the entire catalog page. Manages `activeCategory`, `sortOrder`, and `searchQuery` state. Derives `filteredProducts` via `useMemo` — filters by name when searching, by `product.material` when a category is active, then sorts. On mobile, hides `FilterBar` and shows a "Filters" button that opens `FilterDrawer`.

| Prop | Type | Description |
|------|------|-------------|
| `products` | `Product[]` | Full product list from the server, passed down from the page Server Component |

### `CatalogProductCard`

Server-renderable card for the catalog grid. Links to `/catalog/[slug]`. Displays product image (aspect-square), material badge with colour coding, name, starting price, and in-stock indicator.

Material badge colours: Gold → amber tint, Silver → stone/bordered, Crystal → green tint, Tools → terracotta tint.

| Prop | Type | Description |
|------|------|-------------|
| `product` | `Product` | Full product object from `@/lib/types/product` |

### `FilterBar`

Client component. Desktop-only horizontal filter bar. Renders category pill buttons (`All`, `Gold`, `Silver`, `Crystal`, `Tools`) and a sort `<select>` (Latest / Price: Low to High / Price: High to Low).

| Prop | Type | Description |
|------|------|-------------|
| `activeCategory` | `Category` | Currently selected category |
| `onCategoryChange` | `(category: Category) => void` | Called when a category pill is clicked |
| `sortOrder` | `SortOrder` | Currently selected sort |
| `onSortChange` | `(sort: SortOrder) => void` | Called when the sort select changes |

Exports the `Category` and `SortOrder` types for use by `CatalogClient` and `FilterDrawer`.

### `FilterDrawer`

Client component. Mobile filter panel. Wraps `MobileDrawer` with category pills and sort options. Closes the drawer automatically after a selection is made.

Shares the same `Category` and `SortOrder` types as `FilterBar`. Props mirror `FilterBar` with the addition of `isOpen: boolean` and `onClose: () => void`.

### `SearchInput`

Client component. A text input with a search icon. Controlled via `value`/`onChange`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | — | Current search string |
| `onChange` | `(value: string) => void` | — | Called on every keystroke |
| `placeholder` | `string` | `'Search products…'` | Input placeholder text |

---

## `checkout/`

Components for the `/checkout` two-step form flow.

### `CheckoutForm`

Client component. Step one of checkout. Collects customer details: first name, last name, email, phone, delivery address, and Nigerian state (via a `<select>` populated from `NIGERIAN_STATES`). For international orders, the form fields are replaced by a WhatsApp contact link. Validates fields on submit before calling `onSubmit`.

| Prop | Type | Description |
|------|------|-------------|
| `onSubmit` | `(details: CustomerDetails) => void` | Called with validated form data |
| `defaultValues` | `CustomerDetails \| undefined` | Pre-fills fields (used when navigating back from review) |

Exports the `CustomerDetails` interface for use by `OrderReview` and the checkout page.

### `OrderReview`

Client component. Step two of checkout. Shows the itemised order, a price breakdown (subtotal + shipping calculated from `getShippingCost(state)` + total in NGN), and a delivery address summary. Generates a stable Paystack reference on mount (`TW-{timestamp}-{random}`). Renders `PaystackButton` with the total amount in kobo.

| Prop | Type | Description |
|------|------|-------------|
| `items` | `CartItem[]` | Cart items from `CartContext` |
| `customerDetails` | `CustomerDetails` | Customer details from `CheckoutForm` |
| `onBack` | `() => void` | Navigate back to the form |
| `onPaymentSuccess` | `(reference: string) => void` | Called after Paystack confirms payment |

### `PaystackButton`

Client component. A button that opens the Paystack inline payment popup via dynamic import of `@paystack/inline-js`. Uses `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`. Displays the amount as `₦{amount}` in the button label.

| Prop | Type | Description |
|------|------|-------------|
| `config` | `PaystackConfig` | `{ email, amountKobo, reference, metadata }` |
| `onSuccess` | `(reference: string) => void` | Called with the Paystack transaction reference |
| `onClose` | `() => void` | Called when the popup is dismissed without payment |
| `disabled` | `boolean \| undefined` | Disables the button |

---

## `faq/`

### `FaqAccordion`

Client component. Renders FAQs grouped by `category` from the Supabase `faqs` table. Each category is a `<section>` heading. Within a category, FAQs expand and collapse using a CSS grid-rows animation (no JavaScript height measurement). Only one item can be open at a time.

| Prop | Type | Description |
|------|------|-------------|
| `faqs` | `Faq[]` | Array of FAQ rows from the `faqs` Supabase table |

---

## `home/`

Section components assembled on the homepage (`/`).

### `HeroSection`

Server component. Full-viewport hero with the headline "Adorn Your Locs", a subheading, a CTA link to `/catalog`, and a secondary WhatsApp order link. No props.

### `FeaturedProductsSection`

Client component. A 4-column product grid for featured products. Manages `selectedProduct` state. Clicking "Add to cart" on a `ProductCard` opens `AddToCartModal` for that product.

| Prop | Type | Description |
|------|------|-------------|
| `products` | `Product[]` | Featured products fetched server-side |

### `ProductCard`

Used exclusively in `FeaturedProductsSection`. Renders a product image, name, price range, and an "Add to cart" button that calls `onAddToCart`. Does not dispatch to the cart directly — delegates to the parent.

| Prop | Type | Description |
|------|------|-------------|
| `product` | `Product` | Product to display |
| `onAddToCart` | `() => void` | Called when the button is clicked |

### `AddToCartModal`

Client component. A centred overlay modal (`role="dialog"`) for adding a product to the cart from the homepage product grid. Lets the shopper select variant (size), pack size (tier), and thread colour. Colour selection is required for non-Tool products before the "Add to cart" button is enabled. Dispatches `ADD_ITEM` to `CartContext` on confirmation, then closes.

| Prop | Type | Description |
|------|------|-------------|
| `product` | `Product` | Product whose options are being selected |
| `onClose` | `() => void` | Closes the modal |

### `BrandStorySection`

Server component. Two-column section with brand narrative text and an image placeholder. Links to `/about`. Content contains `TODO` comments for placeholder copy to be replaced with real brand content. No props.

### `TestimonialsSection`

Client component. Auto-rotating testimonial carousel with a 5-second interval. Dot indicators allow manual navigation.

| Prop | Type | Description |
|------|------|-------------|
| `testimonials` | `Testimonial[]` | Testimonial objects from `@/lib/mock/testimonials` |

### `InstagramCTASection`

Server component. Dark cocoa-background section linking to the brand Instagram account. Handle and URL come from `BUSINESS.instagram` in `@/lib/config/business`. No props.

---

## `layout/`

Site-wide chrome components used across all storefront pages.

### `StorefrontChrome`

Client component. The root layout wrapper. Reads `pathname` and conditionally suppresses the header/footer/WhatsApp button for any path that starts with `/admin`. For all other paths, wraps `children` with `Header`, `Footer`, and `WhatsAppButton`.

| Prop | Type | Description |
|------|------|-------------|
| `children` | `React.ReactNode` | Page content |

### `Header`

Client component. Sticky top navigation bar (`z-30`). Shows the "Twinkle Locs" logo, desktop nav links (Shop, About, Blog, FAQ, Shipping), and a cart button with an item count badge. On mobile, the nav links are replaced by a hamburger button that opens `MobileDrawer`. Reads cart item count from `useCart()`.

No props.

### `Footer`

Server component. Four-column footer with brand tagline, navigation links, social links (Instagram, WhatsApp via `BUSINESS` config), and the `NewsletterForm`. No props.

### `MobileDrawer`

Client component. A reusable left-slide drawer primitive used by `Header` (for mobile navigation) and `FilterDrawer` (for catalog filters). Handles body scroll lock and Escape-key dismissal. Renders `children` inside the panel.

| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | `boolean` | Controls open/closed state |
| `onClose` | `() => void` | Called when the backdrop is clicked or Escape is pressed |
| `children` | `React.ReactNode` | Drawer content |

### `NewsletterForm`

Client component. Email sign-up form embedded in the footer. POSTs to `/api/newsletter/subscribe` with `first_name`, `email`, and `source_page`. Handles four states: `idle`, `loading`, `success`, `duplicate`, and `error`, with inline feedback messages for each.

No props.

---

## `product/`

Components for the `/catalog/[slug]` product detail page.

### `ProductDetailClient`

Client component. The interactive right column of the product detail layout. Manages selected variant, pack size tier, and thread colour. Renders size picker, optional tier/pack-size picker, and a thread colour swatch picker (required for non-Tool products). Dispatches `ADD_ITEM` to `CartContext`.

| Prop | Type | Description |
|------|------|-------------|
| `product` | `Product` | Full product object including `variants`, `price_tiers`, and `images` |

### `ProductImageGallery`

Client component. Left column of the product detail layout. Shows a large main image and a horizontal thumbnail rail when the product has more than one image. Clicking a thumbnail updates the main image.

| Prop | Type | Description |
|------|------|-------------|
| `images` | `string[]` | Ordered list of image URLs; falls back to `[product.image]` when no gallery images are set |
| `alt` | `string` | Alt text applied to all images |

### `ProductReviews`

Server-renderable. Renders approved customer reviews below the product detail. Each review shows a star rating (1–5), author name, formatted date (locale: `en-NG`), and review body. Shows an empty-state message when `reviews` is empty.

| Prop | Type | Description |
|------|------|-------------|
| `reviews` | `Review[]` | Review objects from `@/lib/types/review` |

### `RelatedProducts`

Server-renderable. A "You might also like" grid rendered below the main product detail. Reuses `CatalogProductCard`. Returns `null` when the `products` array is empty.

| Prop | Type | Description |
|------|------|-------------|
| `products` | `Product[]` | Related products (filtered server-side, typically same material category) |

### `UpsellBlock`

Server-renderable. A promotional block promoting loc shears alongside bead products. Renders a single `CatalogProductCard` for the shears product inside a styled container.

| Prop | Type | Description |
|------|------|-------------|
| `shears` | `Product` | The shears product fetched server-side |

---

## Key shared patterns

**Cart state** — All interactive cart components read from and write to `CartContext` (`useCart()` hook). The context is provided at the root by `providers.tsx`. Cart actions: `ADD_ITEM`, `REMOVE_ITEM`, `UPDATE_QTY`, `OPEN_DRAWER`, `CLOSE_DRAWER`.

**`BUSINESS` config** — Multiple components import `BUSINESS` from `@/lib/config/business` for WhatsApp URLs and Instagram handle/URL. This is the single source of truth for all external business links.

**`MobileDrawer` primitive** — Both the mobile navigation drawer (`Header`) and the mobile filter drawer (`FilterDrawer`) are built on the shared `MobileDrawer` primitive, ensuring consistent slide animation, body-scroll locking, and Escape-key behaviour.

**Supabase types** — Components working with CMS data (`AboutSection`, `BlogPostCard`, `FaqAccordion`) import types from `@/types/supabase`, which is generated from the database schema.

**Product types** — All product-related components share the `Product` type from `@/lib/types/product`. Material is typed as `ProductMaterial = 'Gold' | 'Silver' | 'Crystal' | 'Tools'`.
