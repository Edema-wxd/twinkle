# Phase 2: Homepage - Research

**Researched:** 2026-03-20
**Domain:** Next.js 15 App Router marketing page — static sections + interactive client islands
**Confidence:** HIGH

---

## Summary

Phase 2 builds a five-section homepage (Hero, Featured Products, Brand Story, Testimonials, Instagram CTA) on top of the Phase 1 root layout that already provides Header, Footer, and WhatsAppButton. The page.tsx itself is a Server Component; only the two interactive sections (Testimonials carousel, Add-to-cart modal) need `'use client'` boundaries, isolated as leaf components.

The standard approach is: `src/app/page.tsx` (Server Component, composes section components) plus `src/components/home/` for the section files. Interactive sections get their own files with `'use client'` at the top. No third-party carousel or modal library is needed — both features are simple enough for a hand-rolled implementation using `useState` + `useEffect`.

The Supabase products table does not exist in Phase 2. Featured products must use a static mock array typed with a `MockProduct` interface that anticipates the real Phase 3 schema shape. Phase 3 will replace this array with a live query; the interface should be designed so the swap is a one-line change.

**Primary recommendation:** Server Component page.tsx + isolated `'use client'` leaf components for carousel and modal. No external carousel or dialog libraries. Static mock data typed to match the anticipated Supabase schema.

---

## Standard Stack

### Core — already in project, no new installs needed

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | ^15.0.0 | App Router, `next/image`, `next/link` | Already installed |
| React | ^19.0.0 | `useState`, `useEffect`, `useRef` | Already installed |
| Tailwind CSS | ^4.0 | Utility classes, gradients, responsive grid | Already installed |
| TypeScript | ^5 | Type safety for mock data and props | Already installed |

### Supporting — no new packages needed

The carousel, modal, and grid are all achievable with built-in React hooks and Tailwind utilities. Do not install external carousel or dialog libraries for this phase.

### Alternatives Considered

| Instead of | Could Use | Why Not |
|------------|-----------|---------|
| Hand-rolled carousel | `embla-carousel-react` | Overkill for one-at-a-time testimonials; adds bundle weight |
| Hand-rolled carousel | `swiper` | Same — unnecessary dependency for simple use case |
| `<dialog>` HTML element | Custom div modal | `<dialog>` has native focus-trap and `::backdrop` — but requires `useRef` + `.showModal()` imperative API which adds complexity; a `<div role="dialog">` pattern is simpler and sufficient here |
| `next/image` with static placeholder | `<img>` tag | Always use `next/image` — automatic WebP, lazy loading, layout shift prevention |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   └── page.tsx                    # Server Component — composes all sections
└── components/
    └── home/
        ├── HeroSection.tsx          # Server Component (no interactivity)
        ├── FeaturedProductsSection.tsx  # Server Component (passes mock data down)
        ├── ProductCard.tsx          # Server Component (receives product as props)
        ├── AddToCartModal.tsx       # 'use client' — useState for open/variant
        ├── BrandStorySection.tsx    # Server Component
        ├── TestimonialsSection.tsx  # 'use client' — useState + useEffect for rotation
        └── InstagramCTASection.tsx  # Server Component
```

Mock data and types live alongside the section that uses them — or in `src/lib/mock/`:

```
src/
└── lib/
    └── mock/
        ├── products.ts          # MockProduct[] array + MockProduct type
        └── testimonials.ts      # Testimonial[] array + Testimonial type
```

### Pattern 1: Server Component Page Composing Client Islands

`page.tsx` stays a Server Component. Interactive sections are imported as Client Components (they declare `'use client'` internally). The page does not need `'use client'`.

```typescript
// src/app/page.tsx — NO 'use client' needed
import { HeroSection } from '@/components/home/HeroSection'
import { FeaturedProductsSection } from '@/components/home/FeaturedProductsSection'
import { BrandStorySection } from '@/components/home/BrandStorySection'
import { TestimonialsSection } from '@/components/home/TestimonialsSection'
import { InstagramCTASection } from '@/components/home/InstagramCTASection'
import { FEATURED_PRODUCTS } from '@/lib/mock/products'
import { TESTIMONIALS } from '@/lib/mock/testimonials'

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturedProductsSection products={FEATURED_PRODUCTS} />
      <BrandStorySection />
      <TestimonialsSection testimonials={TESTIMONIALS} />
      <InstagramCTASection />
    </>
  )
}
```

**Source:** https://nextjs.org/docs/app/getting-started/server-and-client-components

### Pattern 2: Isolated Client Component for Carousel

The testimonial carousel needs `useState` (current index) and `useEffect` (interval). Isolate this in its own file.

```typescript
// src/components/home/TestimonialsSection.tsx
'use client'

import { useState, useEffect } from 'react'

const ROTATION_MS = 5000

export function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setCurrent(c => (c + 1) % testimonials.length)
    }, ROTATION_MS)
    return () => clearInterval(id)  // cleanup prevents memory leak
  }, [testimonials.length])

  const t = testimonials[current]
  // render single testimonial card
}
```

Key points:
- Use the functional updater form `c => (c + 1) % length` to avoid adding `current` to the dependency array, preventing needless interval teardown/setup.
- Always `clearInterval` in the cleanup to prevent memory leaks when the component unmounts.
- `testimonials.length` in the dep array is safe — it is stable for static mock data.

### Pattern 3: Modal as Client Component, Triggered from Product Card

The "Add to cart" modal requires `useState` (open + selected variant). The ProductCard renders a button; clicking it calls a handler that opens the modal.

The cleanest approach for Phase 2: `FeaturedProductsSection` is the Client Component boundary that owns modal state. It renders the grid of `ProductCard` children and the `AddToCartModal`.

```typescript
// src/components/home/FeaturedProductsSection.tsx
'use client'

import { useState } from 'react'
import { ProductCard } from './ProductCard'
import { AddToCartModal } from './AddToCartModal'
import type { MockProduct } from '@/lib/mock/products'

export function FeaturedProductsSection({ products }: { products: MockProduct[] }) {
  const [selectedProduct, setSelectedProduct] = useState<MockProduct | null>(null)

  return (
    <section>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map(p => (
          <ProductCard key={p.id} product={p} onAddToCart={() => setSelectedProduct(p)} />
        ))}
      </div>
      {selectedProduct && (
        <AddToCartModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </section>
  )
}
```

`ProductCard` receives `onAddToCart: () => void` as a prop — it does not need `'use client'` unless it has its own hover state. A CSS hover via Tailwind (`hover:shadow-lg hover:-translate-y-1`) handles the lift effect without JS.

### Pattern 4: Modal Implementation (No Library)

```typescript
// src/components/home/AddToCartModal.tsx
'use client'

import { useState, useEffect, useRef } from 'react'

export function AddToCartModal({ product, onClose }: Props) {
  const [selectedVariant, setSelectedVariant] = useState(product.variants[0].id)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    // Fixed overlay
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Select size for ${product.name}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 backdrop-blur-sm"
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="bg-cream rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
        {/* modal content */}
      </div>
    </div>
  )
}
```

The modal is Phase 2 only — it shows a size/variant picker and a "Add to cart" button that is a no-op (console.log or toast) because the cart system is Phase 5+. The button can display "Coming soon" or simply do nothing visible in Phase 2.

### Pattern 5: Tailwind v4 Gradient Background

In Tailwind v4, gradients use `bg-linear-*` NOT `bg-gradient-*` (that was v3).

```html
<!-- Hero gradient using @theme colors -->
<section class="bg-linear-to-br from-cocoa via-cocoa/80 to-gold/30 min-h-[80vh]">
```

The `--color-*` variables defined in `globals.css @theme` automatically generate `from-`, `via-`, `to-` utilities. Opacity modifiers work: `from-cocoa/80`.

Color interpolation defaults to OKLAB in v4 (smoother blends). No additional config needed.

```html
<!-- Explicit angle gradient (v4 only) -->
<section class="bg-linear-135 from-cocoa to-gold/20">
```

### Anti-Patterns to Avoid

- **Making page.tsx a Client Component:** Don't add `'use client'` to `src/app/page.tsx`. The page is static content; only leaf components need it.
- **Importing carousel/dialog libraries:** Hand-rolled versions are 20 lines. Libraries add bundle weight and version churn.
- **Using `bg-gradient-to-r`:** This is v3 syntax. In v4 it is `bg-linear-to-r`. Using v3 syntax will silently produce no gradient.
- **Calling Supabase from page.tsx in Phase 2:** The products table doesn't exist yet. Use static mock data only.
- **Giving ProductCard `'use client'` for hover:** CSS hover via Tailwind handles lift effect without JS.
- **Fetching data in a Client Component:** Mock data should be a static const array imported as a module, not fetched.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image optimization | `<img>` with manual lazy loading | `next/image` | Automatic WebP, lazy load, layout shift prevention, responsive `srcset` |
| Navigation links | `<a href>` | `next/link` | Client-side navigation, prefetching |
| Font variables on `<html>` | Manual `<style>` injection | Already done in Phase 1 (`halimun.variable`, etc.) | Already in layout.tsx |
| Interval-based auto-rotate | Third-party carousel | `useEffect + setInterval` | 10 lines, no dependency |
| Modal focus trap | `focus-trap` library | Keyboard `Escape` handler + `aria-modal="true"` | Sufficient for Phase 2 |

**Key insight:** Phase 2 has no complex interactive patterns. The carousel and modal are each under 50 lines of React. External libraries are not justified.

---

## Common Pitfalls

### Pitfall 1: Wrong Gradient Class Name (v3 vs v4)

**What goes wrong:** Developer writes `bg-gradient-to-r from-cocoa to-gold` — zero output, hero has no gradient.
**Why it happens:** Tailwind v3 muscle memory. The class was renamed in v4.
**How to avoid:** Always use `bg-linear-to-r` in this project (v4). Check globals.css — it uses `@import "tailwindcss"` (v4 syntax).
**Warning signs:** Gradient not visible; inspect element shows no `background-image` applied.

### Pitfall 2: `next/image` Missing `width`/`height` or `fill`

**What goes wrong:** Build error or layout shift — `next/image` requires either `width`+`height` props or the `fill` prop.
**Why it happens:** `next/image` in Next.js 15 requires explicit dimensions to prevent CLS (Cumulative Layout Shift).
**How to avoid:** For product cards with a fixed aspect ratio, wrap in a `relative` container and use `fill`:
```tsx
<div className="relative aspect-square w-full">
  <Image src={product.image} alt={product.name} fill className="object-cover rounded-lg" />
</div>
```
**Warning signs:** TypeScript error "width is required" or runtime warning about layout shift.

### Pitfall 3: `setInterval` Without Cleanup in Carousel

**What goes wrong:** Multiple intervals accumulate on re-render; carousel speed doubles/quadruples.
**Why it happens:** `useEffect` without a return function leaves intervals running.
**How to avoid:** Always `return () => clearInterval(id)` from the useEffect.
**Warning signs:** Carousel rotates faster than expected; memory grows over time.

### Pitfall 4: Body Scroll Not Restored After Modal Close

**What goes wrong:** Page stays un-scrollable after modal is dismissed.
**Why it happens:** `document.body.style.overflow = 'hidden'` set on open, but not reset on close.
**How to avoid:** Use `useEffect` with cleanup: set overflow hidden on mount, reset to `''` on unmount.
**Warning signs:** Page cannot scroll after opening and closing the modal.

### Pitfall 5: Opacity Modifier Syntax Error in Tailwind v4

**What goes wrong:** Writing `from-cocoa-80` instead of `from-cocoa/80`.
**Why it happens:** Confusion between color shade suffix (e.g., `gold-500`) and opacity modifier (`gold/50`).
**How to avoid:** Opacity is always a slash: `bg-cocoa/60`, `from-gold/20`, `text-charcoal/70`.
**Warning signs:** Tailwind generates no output for the class; colour appears fully opaque.

### Pitfall 6: `'use client'` on a Parent That Doesn't Need It

**What goes wrong:** Adding `'use client'` to `FeaturedProductsSection` unnecessarily makes all its children part of the client bundle even when they have no interactivity.
**Why it happens:** Developer thinks the whole section needs to be client because the modal is interactive.
**How to avoid:** Only add `'use client'` when the component itself uses `useState`, `useEffect`, or event handlers. In this phase, `FeaturedProductsSection` DOES need it because it holds modal state — this is correct. `HeroSection`, `BrandStorySection`, `InstagramCTASection` do NOT.

### Pitfall 7: Using `<img>` for Initials Avatar

**What goes wrong:** No image for testimonials — developer uses `<img>` with a broken `src`.
**Why it happens:** Testimonials have no photos.
**How to avoid:** Render initials as a styled `<div>` with a background colour derived from the customer name. No `<img>` or `next/image` needed for initials-only avatars.

---

## Code Examples

Verified patterns from official sources:

### Hero Section Gradient (Tailwind v4)

```tsx
// Source: https://tailwindcss.com/docs/background-image
// Source: https://tailwindcss.com/blog/tailwindcss-v4
<section className="bg-linear-to-br from-cocoa via-cocoa/75 to-gold/25 min-h-[85vh] flex flex-col items-center justify-center text-center px-4 py-20">
  <h1 className="font-display text-6xl md:text-7xl text-gold leading-tight mb-6">
    Twinkle Locs
  </h1>
  <p className="font-heading text-xl text-cream/80 max-w-xl mb-10">
    Premium loc bead accessories — crafted for your journey
  </p>
  <a
    href="/catalog"
    className="bg-gold text-cocoa font-heading font-semibold px-10 py-4 rounded-lg hover:bg-terracotta hover:text-cream transition-colors text-lg"
  >
    Explore Beads
  </a>
  <a
    href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}`}
    className="mt-4 font-body text-sm text-cream/60 hover:text-cream transition-colors underline underline-offset-2"
  >
    or order on WhatsApp
  </a>
</section>
```

### Auto-Rotating Testimonial Carousel

```tsx
// Source: https://react.dev/reference/react/useEffect
'use client'

import { useState, useEffect } from 'react'
import type { Testimonial } from '@/lib/mock/testimonials'

export function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setIdx(i => (i + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(id)
  }, [testimonials.length])

  const t = testimonials[idx]

  return (
    <section className="bg-stone py-20 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <blockquote className="font-body text-lg text-charcoal/80 italic mb-6">
          &ldquo;{t.quote}&rdquo;
        </blockquote>
        {/* Initials avatar */}
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gold flex items-center justify-center">
            <span className="font-heading font-semibold text-cocoa text-sm">
              {t.name.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          <span className="font-heading font-medium text-charcoal">{t.name}</span>
        </div>
        {/* Dot indicators */}
        <div className="flex justify-center gap-2 mt-6">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`w-2 h-2 rounded-full transition-colors ${i === idx ? 'bg-gold' : 'bg-charcoal/20'}`}
              aria-label={`Go to testimonial ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
```

### Product Card with next/image Fill Pattern

```tsx
// Source: https://nextjs.org/docs/app/api-reference/components/image
import Image from 'next/image'
import type { MockProduct } from '@/lib/mock/products'

interface ProductCardProps {
  product: MockProduct
  onAddToCart: () => void
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <article className="bg-stone rounded-xl overflow-hidden group hover:-translate-y-1 hover:shadow-lg transition-all duration-200">
      <div className="relative aspect-square w-full">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover"
        />
      </div>
      <div className="p-4">
        <h3 className="font-heading font-semibold text-cocoa mb-1">{product.name}</h3>
        <p className="font-body text-sm text-charcoal/60 mb-3">
          ₦{product.price_min.toLocaleString()} – ₦{product.price_max.toLocaleString()}
        </p>
        <button
          onClick={onAddToCart}
          className="w-full bg-gold text-cocoa font-heading font-semibold py-2 rounded-lg hover:bg-terracotta hover:text-cream transition-colors text-sm"
        >
          Add to cart
        </button>
      </div>
    </article>
  )
}
```

### 4-Column Responsive Grid

```tsx
// Tailwind v4 — no config needed for these breakpoints
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
  {products.map(p => (
    <ProductCard key={p.id} product={p} onAddToCart={() => setSelectedProduct(p)} />
  ))}
</div>
```

---

## Mock Data Structure

The Supabase products table (Phase 3) will have products and product_variants as separate tables with a one-to-many relationship. The Phase 2 mock must anticipate this shape so Phase 3's swap is trivial.

### MockProduct Interface

```typescript
// src/lib/mock/products.ts

export interface MockProductVariant {
  id: string
  name: string        // e.g. "Small (4mm)", "Medium (6mm)", "Large (8mm)"
  price: number       // in Naira kobo-free (e.g. 2500 = ₦2,500)
  in_stock: boolean
}

export interface MockProduct {
  id: string
  name: string
  slug: string
  description: string
  image: string               // path to /public/images/ placeholder
  is_featured: boolean
  variants: MockProductVariant[]
  price_min: number           // derived: Math.min(...variants.map(v => v.price))
  price_max: number           // derived: Math.max(...variants.map(v => v.price))
}

export const FEATURED_PRODUCTS: MockProduct[] = [
  {
    id: 'prod_001',
    name: 'Gold Shimmer Beads',
    slug: 'gold-shimmer-beads',
    description: 'Gleaming gold-toned loc beads for an afro-luxury look.',
    image: '/images/products/gold-shimmer.jpg',
    is_featured: true,
    variants: [
      { id: 'var_001a', name: 'Small (4mm)', price: 2500, in_stock: true },
      { id: 'var_001b', name: 'Medium (6mm)', price: 3200, in_stock: true },
      { id: 'var_001c', name: 'Large (8mm)', price: 4000, in_stock: false },
    ],
    price_min: 2500,
    price_max: 4000,
  },
  // ... 3 more featured products
]
```

**Design rationale:** `price_min`/`price_max` are denormalised on the mock (Phase 3 will compute them via a DB view or Supabase RPC). The `image` field points to a local public path — Phase 2 ships with placeholder images in `/public/images/products/`. When no real photos exist, use a single branded placeholder image for all four cards.

### Testimonial Interface

```typescript
// src/lib/mock/testimonials.ts

export interface Testimonial {
  id: string
  name: string      // "Adaeze O."
  quote: string     // testimonial text
  // No photo field — initials avatar derived from name
}

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 't1',
    name: 'Adaeze O.',
    quote: 'These beads are absolutely stunning. I get compliments every time I wear them.',
  },
  {
    id: 't2',
    name: 'Funmi A.',
    quote: 'Best quality loc accessories I have found in Nigeria. Fast delivery too!',
  },
  {
    id: 't3',
    name: 'Chiamaka B.',
    quote: 'The gold shimmer beads are exactly what I needed for my anniversary look.',
  },
]
```

---

## Placeholder Images Strategy

Phase 2 has no real product photography. Two options:

**Option A (recommended for Phase 2):** Create a single branded SVG placeholder in `/public/images/products/placeholder.jpg` — a warm cream/gold rectangle with the Twinkle Locs wordmark. All four product cards use the same image. This is honest (visually coherent placeholder) and avoids 404s.

**Option B:** Use the `placeholder="blur"` prop on `next/image` with an inline `blurDataURL` — but this requires having an actual image src that is valid.

For Phase 2, use a real static JPEG/PNG placeholder in `/public/images/products/` rather than external URLs (avoids `remotePatterns` config). The `next.config.js` / `next.config.ts` does not need `remotePatterns` if all images are local.

---

## State of the Art

| Old Approach | Current Approach | Reason |
|--------------|------------------|--------|
| `bg-gradient-to-r` | `bg-linear-to-r` | Tailwind v4 renamed gradient utilities |
| `tailwind.config.js` for custom colours | `@theme` in `globals.css` | Tailwind v4 CSS-first config |
| `shadow-sm` for subtle shadow | `shadow-xs` | v4 renamed: what was `sm` is now `xs` |
| `rounded` for default radius | `rounded-sm` | v4 renamed: default is now `rounded-sm` |
| `focus:outline-none` | `focus:outline-hidden` | v4 renamed utility |
| Data fetching in `getStaticProps` | Server Component `async` function | App Router paradigm |
| `pages/index.tsx` | `app/page.tsx` | App Router |

**Deprecated/outdated to avoid:**
- `bg-gradient-to-*`: Use `bg-linear-to-*`
- `shadow-sm` for "just a touch of shadow": Use `shadow-xs`; `shadow-sm` is now the former default shadow

---

## Open Questions

1. **Placeholder product images**
   - What we know: No real photos exist yet; placeholder needed for Phase 2
   - What's unclear: Whether to invest in a branded SVG placeholder or use CSS-only product card designs (no image at all, just colour swatches)
   - Recommendation: Use a simple cream/gold SVG placeholder JPEG in `/public/images/products/` for all four cards. Phase 3 adds real images when the Supabase storage bucket is set up.

2. **"Add to cart" no-op behaviour**
   - What we know: Cart system is Phase 5+; the modal variant picker has no real action yet
   - What's unclear: Should the confirm button show a toast, a text confirmation, or silently close?
   - Recommendation: On confirm, close the modal and show no toast (Phase 5 wires this up). The button can read "Add to cart" and just call `onClose()`. Do not install a toast library in Phase 2.

3. **Brand story image**
   - What we know: The split layout needs a photo of Unoma or the product
   - What's unclear: Whether a real photo exists for Phase 2
   - Recommendation: Use the same placeholder image strategy — a styled div with brand colours and the wordmark, or a warm-toned hero image from a royalty-free African hair photography source as a temporary placeholder. Mark clearly in code with `// TODO: Replace with real brand story photo`.

---

## Sources

### Primary (HIGH confidence)
- Next.js official docs — `https://nextjs.org/docs/app/getting-started/server-and-client-components` — server vs client component rules and composition patterns
- Next.js official docs — `https://nextjs.org/docs/app/api-reference/components/image` — `next/image` fill, sizes, placeholder props (fetched 2026-03-20, version 16.2.0)
- Tailwind CSS official docs — `https://tailwindcss.com/docs/background-image` — v4 gradient utility syntax
- Tailwind CSS official docs — `https://tailwindcss.com/docs/theme` — `@theme` variable-to-utility mapping
- Tailwind CSS official upgrade guide — `https://tailwindcss.com/docs/upgrade-guide` — v3→v4 breaking changes
- Tailwind CSS v4.0 release blog — `https://tailwindcss.com/blog/tailwindcss-v4` — OKLAB default, new utility names

### Secondary (MEDIUM confidence)
- React official docs — `https://react.dev/reference/react/useEffect` — `useEffect` + `setInterval` cleanup pattern

### Tertiary (LOW confidence)
- WebSearch: Next.js 15 homepage section file structure patterns — community blog posts confirming section-component architecture; not verified against single official source

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project; no new decisions needed
- Architecture (Server vs Client): HIGH — verified against official Next.js 15 docs
- Tailwind v4 gradients: HIGH — verified against official Tailwind v4 docs and upgrade guide
- Carousel pattern: HIGH — standard React `useEffect + setInterval` with cleanup
- Modal pattern: HIGH — standard React `useState` with accessibility attributes
- Mock data shape: MEDIUM — anticipates Phase 3 schema design; will need adjustment when Phase 3 decides exact Supabase table structure
- Placeholder image strategy: LOW — no official source; practical recommendation only

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (stable ecosystem; Tailwind v4 and Next.js 15 are both stable releases)
