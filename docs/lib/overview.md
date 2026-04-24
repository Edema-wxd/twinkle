<!-- generated-by: gsd-doc-writer -->
# src/lib — Library and Utilities Overview

All shared business logic, data types, client configuration, and utility functions live under `src/lib/`. Nothing in this directory renders UI. Each sub-module has a single well-defined responsibility; cross-module imports flow in one direction (config and types are leaves — they import nothing from sibling modules).

---

## Directory map

```
src/lib/
├── config/
│   └── business.ts         # Single source of truth for all business contact details
├── supabase/
│   ├── client.ts           # Browser Supabase client (client components)
│   ├── server.ts           # SSR Supabase client (Server Components + API routes)
│   ├── admin.ts            # Service-role Supabase client (privileged writes only)
│   └── schema.sql          # Reference SQL for products table + RLS policies + seed data
├── cart/
│   ├── types.ts            # CartItem, CartState, CartAction types
│   ├── cartReducer.ts      # Pure reducer + lineKey helper + initialCartState
│   ├── CartContext.tsx     # CartProvider, useCart hook, localStorage persistence
│   └── threadColours.ts   # THREAD_COLOURS constant + ThreadColourId type
├── checkout/
│   └── shipping.ts         # NIGERIAN_STATES list + getShippingCost function
├── types/
│   ├── product.ts          # Product, ProductVariant, PriceTier, ProductMaterial types
│   └── review.ts           # Review type
├── mock/
│   ├── products.ts         # CATALOG_PRODUCTS — static fallback product data
│   └── testimonials.ts     # TESTIMONIALS — static homepage testimonials
└── fonts.ts                # Next.js font instances (Halimun, Raleway, Inter)
```

---

## Supabase clients (`src/lib/supabase/`)

Three separate clients exist because each context has different auth constraints. Using the wrong client in the wrong context is a security error.

### `client.ts` — Browser client

```typescript
import { createClient } from '@/lib/supabase/client'
```

- Built with `createBrowserClient` from `@supabase/ssr`.
- Typed against the generated `Database` type from `src/types/supabase.ts`.
- Reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Safe to call from `'use client'` components (e.g., `OrderPoller` for Realtime subscriptions).
- **Do not use for writes that require elevated privilege** — the publishable key is public.

### `server.ts` — SSR client

```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
```

- Built with `createServerClient` from `@supabase/ssr`.
- Reads cookies from the Next.js 15 `cookies()` API (must be awaited).
- Passes `getAll` / `setAll` cookie adapters so Supabase can read and refresh session tokens.
- The `setAll` catch block is intentional — Server Components cannot write cookies; token refresh is handled upstream by middleware.
- Use in Server Components, Route Handlers, and Server Actions when the request session is needed.

### `admin.ts` — Service-role client

```typescript
import { createAdminClient } from '@/lib/supabase/admin'

const supabase = createAdminClient()
```

- Built with the bare `createClient` from `@supabase/supabase-js` (not the SSR package).
- Reads `SUPABASE_SERVICE_ROLE_KEY` — throws a descriptive `Error` at startup if the variable is absent.
- Bypasses Row Level Security. Every write this client makes succeeds regardless of auth state.
- **Never import this file from a `'use client'` component.** The service role key must not reach the browser.
- Used by admin API routes (`/api/admin/*`) and the Paystack webhook handler.

### `schema.sql` — Reference schema

Not imported by application code. Contains the `products` table DDL, RLS policies, and seed data. Apply it via the Supabase Dashboard SQL Editor or Supabase CLI. Useful as ground truth when the generated types drift from the live schema.

---

## Business configuration (`src/lib/config/business.ts`)

```typescript
import { BUSINESS } from '@/lib/config/business'
```

The single source of truth for all Twinkle Locs contact details. Edit this file — nowhere else.

| Key | Value | Notes |
|-----|-------|-------|
| `BUSINESS.name` | `'Twinkle Locs'` | Store display name |
| `BUSINESS.whatsapp.number` | `'2349118888010'` | E.164 without the `+` prefix |
| `BUSINESS.whatsapp.url(message?)` | `https://wa.me/2349118888010` | Appends `?text=` when `message` is supplied |
| `BUSINESS.instagram.handle` | `'twinklelocs'` | Without the `@` |
| `BUSINESS.instagram.url` | `https://instagram.com/twinklelocs` | Direct profile link |
| `BUSINESS.support.email` | `hello@twinklelocs.com` | Customer-facing support address |

The object is typed `as const` — TypeScript enforces that callers cannot mutate it.

---

## Cart (`src/lib/cart/`)

The cart is managed entirely client-side with React's `useReducer` and persisted to `localStorage`. No server round-trips occur during cart interactions.

### `types.ts`

Defines the three core cart types:

**`CartItem`** — one line in the cart, identified by a composite key.

| Field | Type | Notes |
|-------|------|-------|
| `productId` | `string` | Supabase product UUID |
| `variantId` | `string` | Supabase variant UUID |
| `tierQty` | `number` | Pack size (e.g. 25, 50, 100) |
| `threadColour` | `string` | Empty string for Tools |
| `productName` | `string` | Display name |
| `variantName` | `string` | Display name (e.g. `'2mm'`) |
| `unitPrice` | `number` | Price in Naira for this tier |
| `imageUrl` | `string` | Product image URL |
| `isTool` | `boolean` | `true` suppresses thread colour selection |
| `quantity` | `number` | 1–10, capped by the reducer |

**`CartState`** — `{ items: CartItem[]; isDrawerOpen: boolean }`

**`CartAction`** — discriminated union: `HYDRATE | ADD_ITEM | UPDATE_QTY | REMOVE_ITEM | CLEAR_CART | OPEN_DRAWER | CLOSE_DRAWER`

### `cartReducer.ts`

Pure reducer with no side effects. Key exports:

- **`lineKey(item)`** — derives the composite cart key `productId:variantId:tierQty:threadColour`. Two `CartItem` objects with the same key are considered the same line and their quantities are merged.
- **`initialCartState`** — `{ items: [], isDrawerOpen: false }`
- **`cartReducer(state, action)`** — handles all `CartAction` cases. `ADD_ITEM` auto-opens the drawer and caps quantity at 10. `UPDATE_QTY` with `qty <= 0` removes the item (equivalent to `REMOVE_ITEM`).

### `CartContext.tsx`

Client component (`'use client'`). Wraps the reducer in React context and handles `localStorage` persistence.

```typescript
import { CartProvider, useCart } from '@/lib/cart/CartContext'

// Wrap the tree (done once in the root layout)
<CartProvider>{children}</CartProvider>

// Consume anywhere inside the tree
const { state, dispatch } = useCart()
```

- On mount, `CartProvider` reads `localStorage` key `twinkle_cart` and dispatches `HYDRATE` to restore previous session items (avoids SSR/hydration mismatch by running only in `useEffect`).
- On every `state.items` change, the provider writes the updated items array back to `localStorage`. Drawer state is not persisted.
- `useCart()` throws if called outside `CartProvider`.

### `threadColours.ts`

```typescript
import { THREAD_COLOURS, type ThreadColourId } from '@/lib/cart/threadColours'
```

Static array of the five available thread colours with `id`, `label`, and `hex` values:

| id | Label | Hex |
|----|-------|-----|
| `red` | Red | `#C0392B` |
| `black` | Black | `#1A1A1A` |
| `light-brown` | Light Brown | `#A0785A` |
| `blonde` | Blonde | `#D4A853` |
| `dark-brown` | Dark Brown | `#5C3317` |

`ThreadColourId` is the union of all `id` values, derived with `typeof THREAD_COLOURS[number]['id']`.

---

## Checkout (`src/lib/checkout/`)

### `shipping.ts`

```typescript
import { getShippingCost, NIGERIAN_STATES } from '@/lib/checkout/shipping'
```

- **`NIGERIAN_STATES`** — array of all 36 states plus FCT Abuja. Used to populate the state dropdown on the checkout form.
- **`getShippingCost(state: string): number`** — returns the flat shipping cost in Naira: Lagos → `3000`, all other states → `4500`. The function is pure and has no external dependencies.

---

## Domain types (`src/lib/types/`)

### `product.ts`

```typescript
import type { Product, ProductVariant, PriceTier, ProductMaterial } from '@/lib/types/product'
```

| Type | Description |
|------|-------------|
| `PriceTier` | `{ qty: number; price: number }` — one pack-size/price pair |
| `ProductVariant` | Variant with `id`, `name`, `price` (lowest tier), `in_stock`, and `price_tiers` array |
| `ProductMaterial` | `'Gold' | 'Silver' | 'Crystal' | 'Tools'` |
| `Product` | Full product record including `slug`, `description`, `seo_description`, `image`, `images?`, `material`, `is_featured`, `variants`, `price_min`, `price_max`, `created_at` |

The `price_min` and `price_max` fields on `Product` are computed at data-entry time (not derived at runtime) and represent the cheapest and most expensive tier across all variants.

### `review.ts`

```typescript
import type { Review } from '@/lib/types/review'
```

`Review` fields: `id`, `product_id`, `author_name`, `body`, `rating` (1–5 integer), `created_at` (ISO 8601).

---

## Mock data (`src/lib/mock/`)

Static data used when Supabase is unavailable or during local development before the database is seeded.

### `products.ts`

Exports `CATALOG_PRODUCTS: Product[]` — an array of representative bead products (24K Gold, Gold, Silver, Crystal variants, and Tools). Also re-exports `Product` as `MockProduct` for backward compatibility with older imports.

### `testimonials.ts`

Exports `TESTIMONIALS: Testimonial[]` — three static customer quotes used on the homepage hero section. `Testimonial` is `{ id: string; name: string; quote: string }`.

---

## Fonts (`src/lib/fonts.ts`)

```typescript
import { halimun, raleway, inter } from '@/lib/fonts'
```

Three Next.js font instances configured with `display: 'swap'` and CSS variable names:

| Export | Font | Variable | Source |
|--------|------|----------|--------|
| `halimun` | Halimun (local) | `--font-halimun` | `public/fonts/Halimun.ttf` |
| `raleway` | Raleway | `--font-raleway` | Google Fonts |
| `inter` | Inter | `--font-inter` | Google Fonts |

Applied in the root layout by adding the variable class names to `<html>`. Halimun is used for headings; Raleway and Inter are used for body and UI text.

---

## Paystack integration

Paystack is not a standalone module in `src/lib/` — it spans two locations:

| Location | Role |
|----------|------|
| `src/components/checkout/PaystackButton.tsx` | Client component that lazily imports `@paystack/inline-js` and opens the payment popup. Reads `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`. Currency is hardcoded to `NGN`. Amounts are passed in kobo. |
| `src/app/api/webhooks/paystack/route.ts` | `POST` handler that verifies the `x-paystack-signature` HMAC-SHA512 header against `PAYSTACK_SECRET_KEY`, then writes `orders` and `order_items` rows using the admin client. Includes idempotency guard (checks for existing `paystack_reference` before inserting). Also marks matching `abandoned_orders` rows as recovered on `charge.success`. |

The metadata object embedded in each Paystack charge carries `cart_items`, `customer_details`, `subtotal`, and `shipping_cost` — the webhook handler reads this to reconstruct the full order without a separate database lookup.

---

## Import conventions

| Context | Use |
|---------|-----|
| Server Component / Route Handler / Server Action | `src/lib/supabase/server.ts` |
| Client Component (Realtime, auth state) | `src/lib/supabase/client.ts` |
| Privileged write (admin route, webhook) | `src/lib/supabase/admin.ts` |
| Any context | `src/lib/config/business.ts`, `src/lib/types/*`, `src/lib/checkout/shipping.ts`, `src/lib/cart/types.ts` |
| Client Component tree only | `src/lib/cart/CartContext.tsx` (requires `CartProvider` ancestor) |
