# Phase 5: Cart & Checkout - Research

**Researched:** 2026-03-23
**Domain:** React cart state, Paystack payments, Supabase order storage, Next.js 15 App Router
**Confidence:** HIGH for cart context and webhook patterns; MEDIUM for Paystack inline-js API shape (official docs blocked, cross-referenced multiple sources)

## Summary

Phase 5 covers a classic e-commerce flow: add-to-cart, checkout, payment, and confirmation. The standard stack for this codebase is already constrained by prior decisions — no Zustand, no Redux, just React context + localStorage. The main unknowns were: which Paystack library to use, how to handle the cart provider boundary in App Router, how to verify webhooks in a Next.js route handler, and the exact Supabase schema shape.

The recommended Paystack approach is `@paystack/inline-js` (Paystack's own NPM package, v2) rather than the community `react-paystack` wrapper. The official package is maintained by Paystack, has TypeScript type definitions available via `@types/paystack__inline-js`, and is loaded as a client-only module inside a `useEffect` to avoid SSR issues. The cart context follows the "providers.tsx wrapper inside layout.tsx" pattern — the Provider is a `'use client'` file, layout stays a Server Component, children remain server-rendered.

The webhook handler must use `req.text()` (not `req.json()`) to get the raw body for HMAC SHA512 verification. Order records use two tables (`orders` + `order_items`) rather than JSONB line items for queryability. The confirmation page should poll via Supabase Realtime subscription rather than `setInterval`, with a timeout fallback after 30 seconds.

**Primary recommendation:** Use `@paystack/inline-js` directly, not `react-paystack`. Load it client-side only. Verify webhooks with raw body text. Store orders in two normalized tables.

---

## 1. Paystack Integration Pattern

### Library Decision

**Use `@paystack/inline-js`** — Paystack's official NPM package (v2 Inline API).

Do NOT use `react-paystack`. It is a community wrapper that re-wraps `@paystack/inline-js` with minimal benefit, adds an indirect dependency, and its TypeScript types are incomplete or from a fork. The official package is the correct primitive.

TypeScript types are available as a separate package: `@types/paystack__inline-js`.

**Installation:**
```bash
npm install @paystack/inline-js
npm install --save-dev @types/paystack__inline-js
```

### The SSR Problem

`@paystack/inline-js` accesses `window` at import time. In Next.js 15, even `'use client'` components execute on the server during SSR. Importing the package at the module level will throw `window is not defined`.

**The fix: dynamic import inside a callback, never at module top level.**

```typescript
// src/components/checkout/PaystackButton.tsx
'use client'

export function PaystackButton({ config, onSuccess, onClose }: Props) {
  async function handlePay() {
    // Dynamic import — runs only in browser, never during SSR
    const PaystackPop = (await import('@paystack/inline-js')).default
    const popup = new PaystackPop()
    popup.newTransaction({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
      email: config.email,
      amount: config.amountKobo, // must be in kobo (Naira × 100)
      ref: config.reference,     // pre-generated on client before opening popup
      currency: 'NGN',
      onSuccess(transaction) {
        // transaction.reference is the key field
        onSuccess(transaction.reference)
      },
      onCancel() {
        onClose()
      },
    })
  }

  return (
    <button onClick={handlePay}>
      Pay ₦{(config.amountKobo / 100).toLocaleString()}
    </button>
  )
}
```

### newTransaction Config Shape

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `key` | string | Yes | Public key `pk_test_...` or `pk_live_...` |
| `email` | string | Yes | Customer email |
| `amount` | number | Yes | In kobo (Naira × 100) |
| `ref` | string | No | Auto-generated if omitted; set it explicitly so you control the reference used in webhook matching |
| `currency` | string | No | Defaults to NGN; set explicitly for clarity |
| `channels` | string[] | No | `['card']` or `['card','bank']` |
| `metadata` | object | No | Extra data; passes through to webhook payload |
| `onSuccess` | function | No | Called with transaction object on success |
| `onCancel` | function | No | Called with no args when popup is dismissed |

### onSuccess Callback

The `onSuccess` callback receives a transaction object. The key field used in this phase is `transaction.reference` (string). Use this reference to match against the webhook payload and to build the `/orders/[reference]` confirmation URL.

Confidence: MEDIUM — Paystack official docs returned 403 during research. Cross-referenced with GitHub documentation repo, npm package page, and multiple implementation articles. All agree the reference is the primary field. The full shape may include status, message, and redirecturl but `reference` is the only field needed here.

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxx
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxx   # NEVER prefix with NEXT_PUBLIC_
```

The public key is safe to expose (prefixed `NEXT_PUBLIC_`). The secret key must never reach the browser.

### Redirect URL for Popup

The popup's `onSuccess` fires in-browser and does NOT use a redirect URL. The redirect URL configuration in the Paystack dashboard is for the standard/redirect integration, not the popup. For this project, use popup only. After `onSuccess` fires, the client navigates programmatically to `/orders/[reference]`.

---

## 2. Cart Context Architecture (Next.js 15 App Router)

### The Hydration Problem

localStorage is browser-only. A cart context that reads localStorage during the render phase will cause a hydration mismatch because:
1. Server renders with an empty cart
2. Client renders with the localStorage cart
3. React detects the mismatch and throws a warning (or error in strict mode)

### Canonical Solution: Load After Mount

The pattern used across the Next.js ecosystem:
- Server renders with empty state (no localStorage access during render)
- A `useEffect` runs after hydration, reads localStorage, and syncs the context state
- Until the effect runs, components render the server-safe initial state (empty cart)

This means the cart icon count shows `0` briefly on first load. This is acceptable — it's a flash of less than 100ms and is the standard e-commerce behavior.

### Provider Architecture

```
src/
├── app/
│   └── layout.tsx          ← Server Component, imports CartProvider
├── components/
│   └── providers.tsx       ← 'use client' — wraps CartContext.Provider
└── lib/
    └── cart/
        ├── CartContext.tsx  ← 'use client' — context definition + hook
        └── cartReducer.ts  ← Pure reducer, no client directive needed
```

**providers.tsx pattern (keeps layout.tsx as Server Component):**

```typescript
// src/components/providers.tsx
'use client'
import { CartProvider } from '@/lib/cart/CartContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>
}
```

```typescript
// src/app/layout.tsx  — stays a Server Component, no 'use client'
import { Providers } from '@/components/providers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" ...>
      <body ...>
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
          <WhatsAppButton />
        </Providers>
      </body>
    </html>
  )
}
```

Note: Header currently has `'use client'` already. It will need to consume CartContext to show the cart item count.

### CartContext Implementation Pattern

```typescript
// src/lib/cart/CartContext.tsx
'use client'
import { createContext, useContext, useReducer, useEffect } from 'react'
import { cartReducer, CartState, CartAction, initialCartState } from './cartReducer'

const CartContext = createContext<{
  state: CartState
  dispatch: React.Dispatch<CartAction>
} | null>(null)

const STORAGE_KEY = 'twinkle_cart'

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialCartState)

  // Load from localStorage AFTER hydration (avoids mismatch)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        dispatch({ type: 'HYDRATE', payload: parsed })
      }
    } catch {
      // Corrupt storage — start fresh
    }
  }, [])

  // Persist to localStorage on every state change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
```

### CartItem Type

```typescript
// src/lib/cart/types.ts
export interface CartItem {
  // Composite key fields — same combo merges, different combo = new line
  productId: string
  variantId: string        // bead size variant
  tierQty: number          // pack size (e.g. 25, 50, 100)
  threadColour: string     // 'red' | 'black' | 'light-brown' | 'blonde' | 'dark-brown'

  // Display fields (snapshotted at add time)
  productName: string
  variantName: string      // e.g. "3mm"
  unitPrice: number        // price for this tier, in Naira
  imageUrl: string
  isTool: boolean          // true → no threadColour (Shears)

  // Mutable
  quantity: number         // 1–10
}
```

### Merge Key

Two items are the same line if ALL of these match: `productId + variantId + tierQty + threadColour`. Build a stable key:
```typescript
function lineKey(item: Pick<CartItem, 'productId' | 'variantId' | 'tierQty' | 'threadColour'>): string {
  return `${item.productId}:${item.variantId}:${item.tierQty}:${item.threadColour}`
}
```

Tools products: use empty string `''` for `threadColour` in the key so the Tools line still has a deterministic key.

### Reducer Actions

| Action | Payload | Behaviour |
|--------|---------|-----------|
| `HYDRATE` | `CartItem[]` | Replace state with localStorage data (mount only) |
| `ADD_ITEM` | `CartItem` | Merge if key exists (qty++, max 10); else append |
| `UPDATE_QTY` | `{ key: string; qty: number }` | Set qty; remove line if qty reaches 0 |
| `REMOVE_ITEM` | `{ key: string }` | Remove line |
| `CLEAR_CART` | — | Empty the cart (called after successful order) |

---

## 3. Paystack Webhook Handling

### Route Location

```
src/app/api/webhooks/paystack/route.ts
```

### Raw Body Requirement

Next.js App Router `Request` automatically parses `application/json` bodies when you call `req.json()`. For webhook verification, you need the **raw bytes** to reproduce the HMAC. Use `req.text()` instead:

```typescript
// src/app/api/webhooks/paystack/route.ts
import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  // 1. Get raw body as text — MUST be called before any other body parsing
  const body = await req.text()

  // 2. Verify signature
  const signature = req.headers.get('x-paystack-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
  }

  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(body)
    .digest('hex')

  if (hash !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // 3. Parse event
  const event = JSON.parse(body)

  // 4. Respond 200 immediately (Paystack expects fast acknowledgement)
  // Process asynchronously to avoid timeout
  if (event.event === 'charge.success') {
    await handleChargeSuccess(event.data)
  }

  return NextResponse.json({ received: true }, { status: 200 })
}

async function handleChargeSuccess(data: PaystackChargeData) {
  // Service role client — bypasses RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_SECRET!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  )

  // Idempotency guard — webhook may fire more than once
  const { data: existing } = await supabase
    .from('orders')
    .select('id')
    .eq('paystack_reference', data.reference)
    .single()

  if (existing) return // Already processed

  // Extract cart from metadata (placed there by client before payment)
  const metadata = data.metadata as PaystackMetadata
  const cartItems = metadata.cart_items
  const customerDetails = metadata.customer_details

  // Insert order
  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      paystack_reference: data.reference,
      paystack_payload: data,
      status: 'paid',
      customer_name: `${customerDetails.first_name} ${customerDetails.last_name}`,
      customer_email: data.customer.email,
      customer_phone: customerDetails.phone,
      delivery_address: customerDetails.delivery_address,
      delivery_state: customerDetails.state,
      subtotal: metadata.subtotal,
      shipping_cost: metadata.shipping_cost,
      total: data.amount / 100, // convert kobo to Naira
      customer_ip: data.ip_address,
    })
    .select('id')
    .single()

  if (error || !order) return

  // Insert line items
  const lineItems = cartItems.map((item) => ({
    order_id: order.id,
    product_id: item.productId,
    product_name: item.productName,
    variant_id: item.variantId,
    variant_name: item.variantName,
    tier_qty: item.tierQty,
    thread_colour: item.isTool ? null : item.threadColour,
    unit_price: item.unitPrice,
    quantity: item.quantity,
    line_total: item.unitPrice * item.quantity,
  }))

  await supabase.from('order_items').insert(lineItems)
}
```

### Passing Cart Data to the Webhook

The cart data (line items, customer details, shipping cost) cannot be stored in Supabase before payment — the order must only be created after webhook confirms. The cleanest way to carry data from the client through Paystack to the webhook is **via Paystack's `metadata` field**.

Paystack passes `metadata` through to the webhook payload verbatim. Set it on `newTransaction`:

```typescript
popup.newTransaction({
  key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
  email: customerDetails.email,
  amount: totalKobo,
  ref: reference,
  metadata: {
    // All data needed to create the order record
    cart_items: cartItems,
    customer_details: {
      first_name, last_name, phone,
      delivery_address, city, state
    },
    subtotal,
    shipping_cost,
  },
})
```

**Metadata size limit:** Paystack's metadata field has a size limit (~5KB). Cart items with thumbnails as URLs are fine; don't embed image blobs.

### Idempotency

Paystack may deliver a webhook more than once (retry on timeout). Always check if an order with the `paystack_reference` already exists before inserting. The guard shown above (`if (existing) return`) handles this.

### No Middleware Interference

This project does not currently have middleware. If middleware is added later, exclude `/api/webhooks/*` from any auth checks:

```typescript
// middleware.ts
export const config = {
  matcher: ['/((?!api/webhooks|_next/static|_next/image|favicon.ico).*)'],
}
```

---

## 4. Order Confirmation Polling

### The Race Condition

After Paystack popup fires `onSuccess`, the client redirects to `/orders/[reference]`. The webhook may not have arrived yet, so the order record may not exist in Supabase. The confirmation page must handle this gracefully.

### Recommended: Supabase Realtime Subscription (not setInterval)

Supabase Realtime's `postgres_changes` subscription is the correct primitive. It fires when a row is inserted that matches a filter, eliminating polling overhead.

```typescript
// src/app/orders/[reference]/OrderPoller.tsx
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  reference: string
  onOrderFound: (order: Order) => void
}

export function OrderPoller({ reference, onOrderFound }: Props) {
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // Timeout after 30s — webhook did not arrive
    const timeout = setTimeout(() => setTimedOut(true), 30_000)

    const channel = supabase
      .channel(`order-${reference}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `paystack_reference=eq.${reference}`,
        },
        (payload) => {
          clearTimeout(timeout)
          onOrderFound(payload.new as Order)
        }
      )
      .subscribe()

    // Also do an immediate fetch — webhook may have arrived before we subscribed
    supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('paystack_reference', reference)
      .single()
      .then(({ data }) => {
        if (data) {
          clearTimeout(timeout)
          onOrderFound(data)
        }
      })

    return () => {
      clearTimeout(timeout)
      supabase.removeChannel(channel)
    }
  }, [reference, onOrderFound])

  if (timedOut) {
    return (
      <p>
        Your payment was received but we're still processing your order.
        Please contact us with reference: {reference}
      </p>
    )
  }

  return <p>Processing your order...</p>
}
```

### Confirmation Page Structure

```typescript
// src/app/orders/[reference]/page.tsx  — Server Component shell
export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ reference: string }>
}) {
  const { reference } = await params // Next.js 15 async params

  // Try to fetch order server-side first (happy path — webhook already arrived)
  const order = await fetchOrderByReference(reference) // server-side Supabase query

  if (order) {
    return <OrderConfirmationView order={order} />
  }

  // Order not yet in DB — client-side poller takes over
  return <OrderPollerWrapper reference={reference} />
}
```

The server-side fetch covers the happy path (webhook arrived before page load). The `OrderPoller` client component handles the race condition. This avoids showing a spinner to most customers.

**Note on Supabase Realtime and RLS:** The `orders` table has no RLS (service-role only for writes). For Realtime subscriptions to work from the browser, Realtime requires either RLS to be enabled with a permissive policy or the `supabase_realtime` publication to be set up. Investigate this during implementation — it may require a `SELECT` policy on orders filtered by `paystack_reference`. Alternatively, fall back to a short `setInterval` poll (every 2s, max 15 attempts) if Realtime configuration is complex.

---

## 5. Supabase Schema for Orders

### Tables

#### `orders`

```sql
CREATE TABLE orders (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Payment
  paystack_reference TEXT NOT NULL UNIQUE,
  paystack_payload   JSONB NOT NULL,  -- raw webhook data.data object
  status             TEXT NOT NULL DEFAULT 'paid',
  -- status enum: 'paid' | 'processing' | 'shipped' | 'delivered'

  -- Customer
  customer_name      TEXT NOT NULL,
  customer_email     TEXT NOT NULL,
  customer_phone     TEXT NOT NULL,
  customer_ip        TEXT,

  -- Delivery
  delivery_address   TEXT NOT NULL,  -- street + city free text
  delivery_state     TEXT NOT NULL,  -- Nigerian state name
  shipping_cost      NUMERIC(10,2) NOT NULL,

  -- Financials
  subtotal           NUMERIC(10,2) NOT NULL,
  total              NUMERIC(10,2) NOT NULL
);

-- Indices
CREATE INDEX orders_paystack_reference_idx ON orders (paystack_reference);
CREATE INDEX orders_created_at_idx ON orders (created_at DESC);
CREATE INDEX orders_status_idx ON orders (status);

-- No RLS — all access via service-role API routes only
```

#### `order_items`

```sql
CREATE TABLE order_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Product snapshot (denormalized — products can change; order is immutable)
  product_id     TEXT NOT NULL,
  product_name   TEXT NOT NULL,
  variant_id     TEXT NOT NULL,
  variant_name   TEXT NOT NULL,   -- e.g. "3mm"
  tier_qty       INTEGER NOT NULL, -- pack size
  thread_colour  TEXT,             -- null for Tools products
  unit_price     NUMERIC(10,2) NOT NULL,
  quantity       INTEGER NOT NULL CHECK (quantity >= 1 AND quantity <= 10),
  line_total     NUMERIC(10,2) NOT NULL
);

CREATE INDEX order_items_order_id_idx ON order_items (order_id);
-- No RLS
```

### Design Decisions

**Separate order_items table (not JSONB):** The line items have a consistent structure. A relational table allows joins (useful for admin Phase 6), indexing, and clean TypeScript types. JSONB would be appropriate only for truly variable structure.

**Denormalized product snapshot:** `product_name`, `variant_name`, `unit_price` are copied at order time. If a product is later edited, the order history remains accurate.

**paystack_payload as JSONB:** The raw Paystack webhook payload is stored for auditing and debugging. This is the variable-structure use case where JSONB is correct.

**No RLS on orders:** As decided in CONTEXT.md. All reads/writes via server-side API routes with the service role key.

### supabase.ts Type Additions

The existing `src/types/supabase.ts` must be extended with `orders` and `order_items` table definitions. The pattern already in use (manual maintenance with `Row | Insert | Update` shapes) applies here.

---

## 6. Thread Colour Selector Integration

### Current State in ProductDetailClient

The thread colour section in `ProductDetailClient.tsx` (lines 132–150) is a **decorative placeholder** with hardcoded swatches, no state, and a "Colour selection coming soon" label. The Add to Cart button is a no-op.

### Changes Required

**1. Add selectedThreadColour state:**

```typescript
// New state alongside existing selectedVariantId and selectedTierQty
const [selectedThreadColour, setSelectedThreadColour] = useState<string | null>(
  product.material === 'Tools' ? '' : null  // Tools auto-select empty; beads require explicit selection
)
```

**2. Thread colour constants** (locked by CONTEXT.md):

```typescript
// src/lib/cart/threadColours.ts
export const THREAD_COLOURS = [
  { id: 'red',        label: 'Red',         hex: '#C0392B' },
  { id: 'black',      label: 'Black',       hex: '#1A1A1A' },
  { id: 'light-brown',label: 'Light Brown', hex: '#A0785A' },
  { id: 'blonde',     label: 'Blonde',      hex: '#D4A853' },
  { id: 'dark-brown', label: 'Dark Brown',  hex: '#5C3317' },
] as const

export type ThreadColourId = typeof THREAD_COLOURS[number]['id']
```

Note: The Phase 4 placeholder uses the existing Tailwind design tokens (`bg-[#1A1A1A]`, `bg-gold`, `bg-terracotta`, `bg-cream`, `bg-forest`), which do not match the locked thread colour list. Phase 5 replaces these with the five locked colours and real selection state.

**3. Replace decorative swatches with interactive picker:**

```typescript
{product.material !== 'Tools' && (
  <div className="mb-8">
    <p className="font-heading text-sm font-semibold text-cocoa mb-3 uppercase tracking-wide">
      Thread Colour
      {selectedThreadColour === null && (
        <span className="text-terracotta ml-2 text-xs font-normal normal-case">
          Required
        </span>
      )}
    </p>
    <div className="flex gap-3">
      {THREAD_COLOURS.map((colour) => (
        <button
          key={colour.id}
          type="button"
          onClick={() => setSelectedThreadColour(colour.id)}
          title={colour.label}
          aria-label={colour.label}
          aria-pressed={selectedThreadColour === colour.id}
          className={`w-8 h-8 rounded-full border-2 transition-all ${
            selectedThreadColour === colour.id
              ? 'border-cocoa scale-110'
              : 'border-transparent hover:border-charcoal/40'
          }`}
          style={{ backgroundColor: colour.hex }}
        />
      ))}
    </div>
    {selectedThreadColour && (
      <p className="text-xs text-charcoal/60 mt-2 font-body">
        {THREAD_COLOURS.find(c => c.id === selectedThreadColour)?.label}
      </p>
    )}
  </div>
)}
```

**4. Disable Add to Cart until colour selected:**

```typescript
const canAddToCart = product.material === 'Tools' || selectedThreadColour !== null

<button
  onClick={handleAddToCart}
  disabled={!canAddToCart}
  className={`w-full font-heading font-semibold py-4 rounded-lg transition-colors mt-8 ${
    canAddToCart
      ? 'bg-gold text-cocoa hover:bg-terracotta hover:text-cream'
      : 'bg-charcoal/20 text-charcoal/40 cursor-not-allowed'
  }`}
>
  {canAddToCart ? 'Add to Cart' : 'Select Thread Colour'}
</button>
```

**5. handleAddToCart wires all three selections to cart context:**

```typescript
function handleAddToCart() {
  dispatch({
    type: 'ADD_ITEM',
    payload: {
      productId: product.id,
      variantId: selectedVariantId,
      tierQty: selectedTierQty,
      threadColour: product.material === 'Tools' ? '' : selectedThreadColour!,
      productName: product.name,
      variantName: selectedVariant?.name ?? '',
      unitPrice: displayPrice,
      imageUrl: product.image,
      isTool: product.material === 'Tools',
      quantity: 1,
    },
  })
  // Cart drawer auto-open handled by context state (e.g. cartDrawerOpen flag in context)
}
```

---

## 7. Key Risks & Gotchas

### Risk 1: Paystack metadata size limit
**What:** Paystack metadata has a ~5KB size limit. A cart with many items and long product names could exceed this.
**Mitigation:** Strip image URLs from metadata cart items (they're for display only). Store only IDs and essential fields. Test with 10 max-size items.

### Risk 2: Webhook arrives before confirmation page loads
**What:** The Realtime subscription is set up after the page mounts. If webhook fires between page navigation start and subscription creation, the INSERT event is missed.
**Mitigation:** Always do an immediate `select` query on mount (shown in the OrderPoller pattern above) before relying on the subscription. This covers the race window.

### Risk 3: Realtime requires Replication on the orders table
**What:** Supabase Realtime `postgres_changes` only works on tables that have been added to the `supabase_realtime` publication. This is not automatic.
**Mitigation:** In Supabase dashboard: Database → Replication → enable the `orders` table under `supabase_realtime`. Alternatively, configure during the Supabase migration scripts.

If Realtime setup proves complex given the no-RLS constraint, fall back to simple `setInterval` polling (2s interval, max 20 attempts = 40s total, then show timeout message).

### Risk 4: Duplicate webhook delivery
**What:** Paystack retries webhooks on timeout. Without an idempotency guard, two order records could be created for one payment.
**Mitigation:** The webhook handler checks for `paystack_reference` uniqueness before inserting. The `UNIQUE` constraint on `orders.paystack_reference` provides a database-level guard as backup.

### Risk 5: Cart hydration flash
**What:** LocalStorage cart loads after hydration. The header cart count shows `0` briefly, then jumps to the actual count. On slow devices this could be noticeable.
**Mitigation:** This is the accepted tradeoff for SSR + localStorage. Do not use `suppressHydrationWarning` on the count element — it masks errors. The flash is < 100ms on typical devices and is standard e-commerce behaviour.

### Risk 6: Paystack public key in client bundle
**What:** `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` is embedded in the JS bundle. This is expected and safe — the public key is designed to be public.
**Risk:** The secret key must never be `NEXT_PUBLIC_`. If accidentally exposed, anyone can create charges. Double-check env var names at implementation time.

### Risk 7: Amount in kobo
**What:** Paystack requires amounts in the smallest currency unit (kobo = Naira / 100). The codebase stores prices in Naira (`price: 3500` means ₦3,500). A subtle off-by-100x error causes massive over/under charges.
**Mitigation:** Create a single conversion utility `toKobo(naira: number): number => naira * 100` and use it everywhere amounts are passed to Paystack. Never pass raw `price` values directly to the popup.

### Risk 8: Thread colour not required for Tools — merge key consistency
**What:** Tools products use `threadColour: ''` (empty string) in the cart line key. If this isn't consistent, identical tool purchases create duplicate lines.
**Mitigation:** The `lineKey` function must handle `isTool` items by always using `''` for thread colour. Enforce this in the reducer, not in the UI.

---

## Standard Stack

| Library | Version | Purpose | Source |
|---------|---------|---------|--------|
| `@paystack/inline-js` | latest | Paystack popup payment | Paystack official npm |
| `@types/paystack__inline-js` | latest | TypeScript types for inline-js | DefinitelyTyped |
| React Context + useReducer | (built-in) | Cart state management | React 19 built-in |
| localStorage | (browser API) | Cart persistence | Browser native |
| Node.js `crypto` | (built-in) | Webhook HMAC verification | Node.js built-in |
| `@supabase/supabase-js` createClient | (already installed) | Service-role DB writes from webhook | Already in project |

No new runtime dependencies beyond `@paystack/inline-js` are needed.

---

## Code Examples

### Supabase Service Role Client (for webhook route)

```typescript
// Used in API routes only — never in client components
import { createClient } from '@supabase/supabase-js'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_SECRET!,  // NOT prefixed NEXT_PUBLIC_
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
)
```

### Shipping Zone Calculation

```typescript
// src/lib/cart/shipping.ts
const LAGOS_STATES = ['Lagos'] as const

export type ShippingZone = 'lagos' | 'nigeria' | 'international'

export function getShippingZone(state: string): ShippingZone {
  if (LAGOS_STATES.includes(state as typeof LAGOS_STATES[number])) return 'lagos'
  return 'nigeria'
}

export function getShippingCost(zone: ShippingZone): number {
  if (zone === 'lagos') return 3000
  if (zone === 'nigeria') return 4500
  return 0 // international — no cost; redirected to WhatsApp
}
```

### Cart Subtotal Calculation

```typescript
export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
}
```

---

## Open Questions

1. **Supabase Realtime + no-RLS**
   - What is known: Realtime `postgres_changes` subscriptions are filtered by the table's RLS policies for authenticated users
   - What is unclear: The exact behaviour when the table has no RLS and the client uses the anon key
   - Recommendation: During implementation, test if a Realtime subscription on `orders` filtered by `paystack_reference` works with the browser client (anon key). If not, enable a permissive `SELECT` policy for the confirmation page lookup only, or fall back to polling.

2. **Paystack metadata 5KB limit verification**
   - What is known: Community sources reference a metadata limit; Paystack official docs were inaccessible (403)
   - What is unclear: The exact size limit and whether it applies to the full payload or just the metadata field
   - Recommendation: Serialize a max-size cart (10 items) and measure. Keep under 4KB to be safe.

3. **react-paystack vs @paystack/inline-js compatibility with React 19**
   - What is known: `react-paystack` last published in 2023; React 19 changes `useEffect` batching behavior
   - What is unclear: Whether `react-paystack` has been tested with React 19
   - Recommendation: Use `@paystack/inline-js` directly (confirmed active, official). Avoids the question entirely.

---

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `src/components/product/ProductDetailClient.tsx`, `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/types/supabase.ts`, `src/app/layout.tsx`, `package.json`
- [Supabase Realtime — subscribing to database changes](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes) — channel setup and postgres_changes pattern
- [Adrian Murage — Supabase Service Role in Next.js Routes](https://adrianmurage.com/posts/supabase-service-role-secret-key/) — verified createClient pattern with auth options

### Secondary (MEDIUM confidence)
- [Paystack GitHub documentation — using-popup.md](https://github.com/PaystackHQ/documentation/blob/master/receiving-payments/payment-methods/using-popup.md) — newTransaction config shape (official repo, docs blocked via 403 on live site)
- [DEV — Paystack webhooks in Next.js App Router](https://dev.to/thekarlesi/how-to-handle-stripe-and-paystack-webhooks-in-nextjs-the-app-router-way-5bgi) — req.text() pattern and HMAC verification
- [DEV — Paystack webhook handling](https://dev.to/ifedayo/handling-paystack-transactions-using-webhooks-4k61) — HMAC-SHA512 verify function code
- [nextsaaspilot.com — Next.js Provider Pattern](https://www.nextsaaspilot.com/blogs/next-js-provider) — providers.tsx wrapping layout.tsx pattern

### Tertiary (LOW confidence)
- WebSearch: react-paystack npm maintenance status (2024 activity confirmed but not deeply verified)
- WebSearch: Paystack metadata size limit (community sources, not official docs)

---

## Metadata

**Confidence breakdown:**
- Paystack integration: MEDIUM — official docs returned 403; cross-referenced GitHub repo + multiple implementation articles. Core API (key, email, amount, ref, onSuccess, onCancel) confirmed from multiple sources
- Cart context architecture: HIGH — standard React pattern, verified against Next.js 15 App Router docs
- Webhook handling: HIGH — HMAC SHA512 + req.text() pattern is well-documented and consistent across sources
- Order confirmation polling: MEDIUM — Supabase Realtime pattern confirmed from official docs; the no-RLS + anon key combination is an open question
- Supabase schema: HIGH — standard relational design, codebase patterns confirmed
- Thread colour integration: HIGH — existing code thoroughly examined; changes are mechanical additions to an established pattern

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (Paystack API is stable; re-check if major version bump)

---

## RESEARCH COMPLETE

**Phase:** 05 - Cart & Checkout
**Confidence:** MEDIUM-HIGH overall

### Key Findings

- Use `@paystack/inline-js` (official) via dynamic import inside a click handler — not at module level and not `react-paystack`
- Cart context: `providers.tsx` wrapper keeps `layout.tsx` as a Server Component; localStorage sync happens in `useEffect` after hydration
- Webhook handler must use `req.text()` not `req.json()` to get the raw body for HMAC SHA512 verification; respond 200 immediately and include idempotency guard
- Order data flows from client → Paystack metadata field → webhook payload → Supabase; no pre-payment order records
- Two normalized tables: `orders` (one row per transaction) + `order_items` (one row per line); no RLS on either
- Thread colour selector is a mechanical addition to `ProductDetailClient.tsx`: add `selectedThreadColour` state alongside existing variant/tier state; disable Add to Cart until colour selected (except Tools)
- Supabase Realtime subscription preferred over polling for confirmation page; combine with an immediate select query to cover the race window; include 30s timeout fallback

### File Created

`/Users/mac/Documents/GitHub/twinkle/.planning/phases/05-cart-checkout/05-RESEARCH.md`

### Open Questions

- Supabase Realtime with no-RLS table: test whether anon key can subscribe to `orders` `postgres_changes`; may need a narrow `SELECT` policy or fallback to polling
- Paystack metadata size limit: measure a 10-item cart payload before relying on metadata as the order data carrier
- Paystack `onSuccess` full transaction object shape: only `reference` is reliably confirmed; verify in test mode during implementation
