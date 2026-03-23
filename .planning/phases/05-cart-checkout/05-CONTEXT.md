# Phase 5: Cart & Checkout - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Add-to-cart through payment: cart state management, cart drawer, /cart page, two-step checkout (address + review/pay), Paystack integration, zone-based shipping logic, international shipping quote flow, and order confirmation page. Thread colour selection (deferred from Phase 4) lands here as a product-detail selector and cart line item attribute.

</domain>

<decisions>
## Implementation Decisions

### Cart persistence
- localStorage + React context: localStorage is the source of truth, React context is the in-memory view
- Cart survives browser close and reopens on return (same device/browser)
- On return with stale items: show a notice ("Some items were removed — they're no longer available") and silently drop the invalid items
- Adding the same product + bead size + pack size + thread colour again increments the existing line item quantity (merge, not new line)
- Maximum quantity per line item: capped at 10 packs
- Cart cleared immediately on successful order confirmation; kept intact after failed or abandoned payment

### Cart drawer
- Auto-opens every time a product is added to cart
- Per line item: product thumbnail, name, selected variants (bead size + pack size), thread colour as a swatch + label, unit price, +/− quantity controls, remove button
- Drawer footer: subtotal (pre-shipping) + single "Checkout" CTA button
- Quantity adjustable directly in the drawer
- Empty state: illustration + "Your cart is empty" message + "Shop Now" link to /catalog

### Cart page (/cart)
- Full /cart page exists alongside the drawer — accessible via cart icon in header
- Shows same line item detail as drawer (including thread colour swatch + label) with quantity controls and remove
- Displays subtotal; shipping calculated at checkout

### Thread colour selection
- Thread colour is a preference on the line item — does not affect price
- Options: red, black, light brown, blonde, dark brown
- Displayed as colour swatches on the product detail page, styled consistently with the existing bead size picker
- Required before Add to Cart activates — button remains disabled until a thread colour is selected
- Thread colour suppressed on Tools products (Shears) — consistent with Phase 4 behaviour
- Two line items with the same bead size + pack size but different thread colours are treated as separate line items (thread colour is a modifier; identical size + pack + colour merges)
- Thread colour stored on each order line item so Unoma can fulfil correctly

### Checkout flow
- Two-step checkout:
  - Step 1: customer details + delivery address
  - Step 2: order review (items + subtotal + shipping + total) + Pay button
- Guest-only — no account required
- Step 1 fields: first name, last name, email, phone number, delivery address (street + city, free text), state (dropdown — drives shipping zone), country toggle (Nigeria / International)
- State dropdown is present solely for shipping zone detection; street/city remain free text

### Shipping logic
- Zone-based domestic rates:
  - Lagos: ₦3,000
  - Rest of Nigeria: ₦4,500
- Zone determined by state dropdown selection on checkout form
- Shipping rate appears on Step 2 review before payment

### International flow
- Nigeria / International radio toggle at the top of the address form
- Selecting International replaces the checkout form and Paystack button with:
  - A message explaining that international shipping requires a quote
  - A WhatsApp link (wa.me) to Unoma for the quote — pre-filled message optional

### Payment failure handling
- If Paystack is closed or payment fails: customer lands back on Step 2 (order review page) with an error banner ("Payment was not completed — please try again")
- Cart is NOT cleared on failed payment — customer can retry without re-entering details
- If the Paystack webhook is delayed: confirmation page shows a "Processing your order..." spinner and polls Supabase until the order record appears, then renders it

### Order storage
- Order record created AFTER Paystack confirms payment via webhook — no order stored for abandoned/failed payments
- Order record contains: line items (product, bead size, pack size, thread colour, qty, unit price), delivery address, subtotal, shipping cost, total, Paystack transaction reference, raw Paystack webhook payload, creation timestamp, customer IP
- Order statuses: paid → processing → shipped → delivered (admin advances manually in Phase 6)
- Orders table: service-role only — no RLS; all reads/writes via server-side API routes
- How the confirmation page retrieves order data: Claude's Discretion (Paystack reference in callback URL is the likely approach)

### Order confirmation
- After Paystack payment succeeds, customer redirected to /orders/[id]
- Confirmation page shows: order number, line items with all variants (size + pack + thread colour), delivery address, and estimated delivery timeframe

### Claude's Discretion
- Illustration choice for cart empty state
- Exact spacing and visual hierarchy inside cart drawer and /cart page
- WhatsApp pre-filled message text
- Estimated delivery copy on confirmation page
- Loading/pending state during Paystack redirect
- Confirmation page order fetch strategy (Paystack reference vs order ID in callback URL)

</decisions>

<specifics>
## Specific Ideas

- Thread colour options locked to: red, black, light brown, blonde, dark brown
- Shipping rates locked: Lagos ₦3,000 / Others ₦4,500
- International flow is WhatsApp-only (no email fallback in this phase)
- All product-page selectors (bead size + pack size + thread colour) visible before Add to Cart — no modal required
- Thread colour swatch + label appears on every bead line item in both the drawer and /cart page

</specifics>

<deferred>
## Deferred Ideas

- Order status tracking / order history page — future phase
- Email confirmation after purchase — future phase
- Promo codes / discount logic — future phase
- Free shipping threshold — not in this phase
- Packing/fulfilment note view in admin (thread colour on line items needs to surface as a printable packing note) — Phase 6 admin panel

</deferred>

---

*Phase: 05-cart-checkout*
*Context gathered: 2026-03-23*
