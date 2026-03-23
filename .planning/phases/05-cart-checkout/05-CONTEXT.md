# Phase 5: Cart & Checkout - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Add-to-cart through payment: cart state management, cart drawer, /cart page, two-step checkout (address + review/pay), Paystack integration, zone-based shipping logic, international shipping quote flow, and order confirmation page. Thread colour selection (deferred from Phase 4) and pack size as a variant dimension also land here — though the variant schema migration is extracted into Phase 4.1.

</domain>

<decisions>
## Implementation Decisions

### Cart drawer
- Auto-opens every time a product is added to cart
- Per line item: product thumbnail, name, selected variants (bead size + pack size + thread colour), unit price, +/− quantity controls, remove button
- Drawer footer: subtotal (pre-shipping) + single "Checkout" CTA button
- Quantity adjustable directly in the drawer (not just on /cart page)
- Empty state: illustration + "Your cart is empty" message + "Shop Now" link to /catalog

### Cart page (/cart)
- Full /cart page exists alongside the drawer — accessible via cart icon in header
- Shows same line item detail as drawer with quantity controls and remove
- Displays subtotal; shipping calculated at checkout

### Pack size variants
- Bead products gain a second variant dimension: pack size (25 / 50 / 100 / 150 / 200 beads)
- Each pack size has its own fixed price (not a per-bead multiplier)
- Not all bead size × pack size combinations exist — valid combinations are product-specific
- Schema migration to support 2D variants is Phase 4.1 (inserted before Phase 5)

### Thread colour selection
- Thread colour is a preference on the line item — does not affect price
- Options: red, black, light brown, blonde, dark brown
- Customer picks bead size + pack size + thread colour all on the product detail page before clicking Add to Cart
- Thread colour selection suppressed on Tools products (Shears) — consistent with Phase 4 behaviour

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

### Order confirmation
- After Paystack payment succeeds, customer redirected to /orders/[id]
- Confirmation page shows: order number, line items with variants, delivery address, and estimated delivery timeframe

### Claude's Discretion
- Illustration choice for cart empty state
- Exact spacing and visual hierarchy inside cart drawer and /cart page
- WhatsApp pre-filled message text
- Estimated delivery copy on confirmation page
- Loading/pending state during Paystack redirect

</decisions>

<specifics>
## Specific Ideas

- Thread colour options locked to: red, black, light brown, blonde, dark brown
- Shipping rates locked: Lagos ₦3,000 / Others ₦4,500
- International flow is WhatsApp-only (no email fallback in this phase)
- All product-page selectors (bead size + pack size + thread colour) visible before Add to Cart — no modal required

</specifics>

<deferred>
## Deferred Ideas

- Phase 4.1 (inserted): variant schema migration to support bead size × pack size 2D matrix — this is a prerequisite to Phase 5, not part of it
- Order status tracking / order history page — future phase
- Email confirmation after purchase — future phase
- Promo codes / discount logic — future phase
- Free shipping threshold — not in this phase

</deferred>

---

*Phase: 05-cart-checkout*
*Context gathered: 2026-03-23*
