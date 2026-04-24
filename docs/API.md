<!-- generated-by: gsd-doc-writer -->
# API Reference

Twinkle Locs exposes a set of Next.js API Route handlers under `/api`. All routes return `application/json`. Monetary values are in **Naira (₦)** except where noted (Paystack webhook payloads use kobo internally).

---

## Authentication

Admin endpoints (`/api/admin/*`) require an authenticated Supabase session. Authentication is handled through Supabase Auth — the session cookie is set when the store owner signs in via `/admin/login`, which calls `supabase.auth.signInWithPassword` through a Next.js Server Action.

Every admin route handler calls `supabase.auth.getUser()` against the Supabase Auth server (not merely a local JWT check) before processing any request. If no valid session is present, the route returns `401 Unauthorized`.

```
Authorization: (Supabase session cookie — set automatically by the browser after login)
```

Public endpoints (`/api/checkout/*`, `/api/newsletter/*`) require no authentication.

The Paystack webhook (`/api/webhooks/paystack`) uses HMAC-SHA512 signature verification instead of session auth. The `x-paystack-signature` header is validated against the raw request body using `PAYSTACK_SECRET_KEY`.

---

## Endpoints Overview

| Method | Path | Auth Required | Description |
|--------|------|:---:|-------------|
| `POST` | `/api/checkout/save-intent` | No | Record a checkout attempt before payment (abandoned order capture) |
| `POST` | `/api/newsletter/subscribe` | No | Subscribe an email address to the newsletter |
| `POST` | `/api/webhooks/paystack` | HMAC signature | Receive Paystack `charge.success` events and create orders |
| `POST` | `/api/admin/products` | Yes | Create a new product |
| `PUT` | `/api/admin/products/[id]` | Yes | Replace a product's fields |
| `DELETE` | `/api/admin/products/[id]` | Yes | Delete a product |
| `PATCH` | `/api/admin/orders/[id]` | Yes | Update an order's fulfilment status |
| `POST` | `/api/admin/blog` | Yes | Create a new blog post |
| `PUT` | `/api/admin/blog/[id]` | Yes | Update a blog post |
| `DELETE` | `/api/admin/blog/[id]` | Yes | Delete a blog post |
| `POST` | `/api/admin/faqs` | Yes | Create a new FAQ entry |
| `PUT` | `/api/admin/faqs/[id]` | Yes | Update a FAQ entry |
| `DELETE` | `/api/admin/faqs/[id]` | Yes | Delete a FAQ entry |
| `POST` | `/api/admin/reviews` | Yes | Create a product review |
| `PUT` | `/api/admin/reviews/[id]` | Yes | Update a product review |
| `DELETE` | `/api/admin/reviews/[id]` | Yes | Delete a product review |
| `PUT` | `/api/admin/settings` | Yes | Upsert arbitrary site settings key-value pairs |
| `PUT` | `/api/admin/shipping` | Yes | Upsert shipping configuration settings |

---

## Public Endpoints

### `POST /api/checkout/save-intent`

Records a checkout attempt before the shopper initiates payment. Used for abandoned order recovery. The inserted row is marked `recovered = true` by the Paystack webhook handler when payment is subsequently completed.

**Request body:**

```json
{
  "customerName": "Amara Okafor",
  "customerEmail": "amara@example.com",
  "customerPhone": "08012345678",
  "deliveryAddress": "12 Bode Thomas Street, Surulere",
  "deliveryState": "Lagos",
  "cartItems": [
    {
      "productId": "uuid",
      "productName": "Gold Spiral Beads",
      "variantId": "uuid",
      "variantName": "10-pack",
      "tierQty": 10,
      "threadColour": "Black",
      "unitPrice": 3500,
      "quantity": 2,
      "isTool": false
    }
  ],
  "subtotal": 7000
}
```

All fields are required. `cartItems` must be a non-empty array. `subtotal` must be a number (Naira). The shipping cost is computed server-side from `deliveryState` using the shipping zone rules (Lagos: ₦3,000; all other states: ₦4,500).

**Success response — `201 Created`:**

```json
{ "id": "uuid-of-abandoned-order-row" }
```

**Error responses:**

| Status | Body | Cause |
|--------|------|-------|
| `400` | `{ "error": "Missing required fields" }` | Any required field is absent or empty |
| `400` | `{ "error": "Invalid JSON" }` | Request body is not valid JSON |
| `500` | `{ "error": "Failed to save" }` | Supabase write failure |

---

### `POST /api/newsletter/subscribe`

Subscribes an email address to the newsletter. Duplicate email addresses return `409` rather than silently failing.

**Request body:**

```json
{
  "first_name": "Chiamaka",
  "email": "chiamaka@example.com",
  "source_page": "/blog/how-to-style-loc-beads"
}
```

`first_name` and `email` are required. `source_page` is optional — pass the current page path for analytics.

**Success response — `201 Created`:**

```json
{ "ok": true }
```

**Error responses:**

| Status | Body | Cause |
|--------|------|-------|
| `400` | `{ "error": "first_name is required" }` | `first_name` is missing or empty |
| `400` | `{ "error": "A valid email address is required" }` | `email` is missing or does not contain `@` and `.` |
| `400` | `{ "error": "Invalid JSON body" }` | Request body is not valid JSON |
| `409` | `{ "error": "already subscribed" }` | Email already exists in `newsletter_subscribers` |
| `500` | `{ "error": "Failed to subscribe. Please try again." }` | Supabase write failure |

---

## Webhook Endpoints

### `POST /api/webhooks/paystack`

Receives `charge.success` events from Paystack. This endpoint is called by Paystack servers — it must not be called directly.

**Signature verification:**

The handler reads the raw request body as text and verifies the `x-paystack-signature` header using HMAC-SHA512 with `PAYSTACK_SECRET_KEY`. The request is rejected with `401` if the header is missing or the signature does not match.

**Handled event:**

Only `charge.success` events are acted upon. All other event types receive `200 { "received": true }` with no side effects.

On a valid `charge.success` event the handler:

1. Checks for an existing `orders` row with the same `paystack_reference` (idempotency guard for duplicate webhook deliveries).
2. Inserts an `orders` row with status `"paid"` and the full customer and shipping details from the Paystack metadata.
3. Inserts `order_items` rows for each cart item embedded in the metadata.
4. Updates any `abandoned_orders` row matching the customer email (`recovered = true`, `recovered_at = now()`).

**Expected Paystack metadata shape** (embedded in the Paystack charge at checkout time):

```json
{
  "cart_items": [
    {
      "productId": "uuid",
      "productName": "Gold Spiral Beads",
      "variantId": "uuid",
      "variantName": "10-pack",
      "tierQty": 10,
      "threadColour": "Black",
      "unitPrice": 3500,
      "quantity": 2,
      "isTool": false
    }
  ],
  "customer_details": {
    "first_name": "Amara",
    "last_name": "Okafor",
    "phone": "08012345678",
    "delivery_address": "12 Bode Thomas Street, Surulere",
    "state": "Lagos"
  },
  "subtotal": 7000,
  "shipping_cost": 3000
}
```

**Success response — `200 OK`:**

```json
{ "received": true }
```

**Error responses:**

| Status | Body | Cause |
|--------|------|-------|
| `401` | `{ "error": "Missing signature" }` | `x-paystack-signature` header absent |
| `401` | `{ "error": "Invalid signature" }` | HMAC-SHA512 verification failed |

---

## Admin Endpoints

All admin endpoints require an authenticated Supabase session. A `401` response is returned if the session is missing or expired.

### Products

#### `POST /api/admin/products`

Creates a new product. If `slug` is omitted, it is auto-generated from `name`.

**Request body:**

```json
{
  "name": "Gold Spiral Beads",
  "slug": "gold-spiral-beads",
  "description": "Premium gold-plated spiral loc beads.",
  "material": "Gold",
  "is_featured": false,
  "is_active": true,
  "variants": [
    {
      "id": "uuid",
      "name": "10-pack",
      "price": 3500,
      "in_stock": true,
      "price_tiers": [
        { "qty": 10, "price": 3500 },
        { "qty": 20, "price": 6000 }
      ]
    }
  ]
}
```

`name` and `material` are required. `material` must be one of `Gold`, `Silver`, `Crystal`, or `Tools`. `price_min` and `price_max` are computed server-side from the `price_tiers` array. If `variants` is omitted, an empty array is used.

**Success response — `201 Created`:** The full product row as stored in Supabase.

**Error responses:**

| Status | Body | Cause |
|--------|------|-------|
| `400` | `{ "error": "name is required" }` | `name` is missing or empty |
| `400` | `{ "error": "material must be one of: Gold, Silver, Crystal, Tools" }` | Invalid `material` value |
| `401` | `{ "error": "Unauthorized" }` | No valid admin session |
| `500` | `{ "error": "Failed to create product" }` | Supabase write failure |

---

#### `PUT /api/admin/products/[id]`

Replaces all product fields. Both `name` and `slug` are required (unlike `POST` which can auto-generate `slug`).

**Request body:** Same shape as `POST /api/admin/products` with `slug` required. Optionally include `image` (string) and `images` (string array) to update media.

**Success response — `200 OK`:** Updated product row.

**Error responses:** Same as `POST` plus `404`-equivalent via Supabase returning no row.

---

#### `DELETE /api/admin/products/[id]`

Permanently deletes a product.

**Success response — `200 OK`:**

```json
{ "success": true }
```

---

### Orders

#### `PATCH /api/admin/orders/[id]`

Updates a single order's fulfilment status.

**Request body:**

```json
{ "status": "shipped" }
```

`status` must be one of: `paid`, `processing`, `shipped`, `delivered`.

**Success response — `200 OK`:**

```json
{ "id": "uuid", "status": "shipped" }
```

**Error responses:**

| Status | Body | Cause |
|--------|------|-------|
| `400` | `{ "error": "Invalid status. Must be one of: paid, processing, shipped, delivered" }` | Unknown status value |
| `401` | `{ "error": "Unauthorized" }` | No valid admin session |
| `404` | `{ "error": "Order not found" }` | No order with the given `id` |
| `500` | `{ "error": "Failed to update order status" }` | Supabase write failure |

---

### Blog Posts

#### `POST /api/admin/blog`

Creates a new blog post. If `slug` is omitted, it is auto-generated from `title`.

**Request body:**

```json
{
  "title": "5 Ways to Style Loc Beads for Summer",
  "slug": "5-ways-to-style-loc-beads-for-summer",
  "body": "<p>HTML content from Tiptap editor</p>",
  "excerpt": "Short description shown in listing pages.",
  "featured_image": "https://project.supabase.co/storage/v1/object/public/blog/image.jpg",
  "tag": "styling",
  "published": false,
  "published_at": null
}
```

`title` is required. When `published` is `true` and `published_at` is not provided, it is set to the current timestamp automatically.

**Success response — `201 Created`:**

```json
{ "post": { ...blog_post_row } }
```

**Error responses:**

| Status | Body | Cause |
|--------|------|-------|
| `400` | `{ "error": "title is required" }` | `title` is missing or empty |
| `401` | `{ "error": "Unauthorized" }` | No valid admin session |
| `409` | `{ "error": "A post with this slug already exists" }` | Slug uniqueness constraint violation |
| `500` | `{ "error": "Failed to create blog post" }` | Supabase write failure |

---

#### `PUT /api/admin/blog/[id]`

Partially updates a blog post. Only fields provided in the body are changed. When `published` transitions from `false` to `true`, `published_at` is set automatically if not supplied.

**Request body:** Any subset of the `POST` body fields.

**Success response — `200 OK`:**

```json
{ "ok": true, "post": { ...blog_post_row } }
```

**Error responses:** Same as `POST` plus `404 { "error": "Post not found" }`.

---

#### `DELETE /api/admin/blog/[id]`

Permanently deletes a blog post.

**Success response — `200 OK`:**

```json
{ "ok": true }
```

---

### FAQs

#### `POST /api/admin/faqs`

Creates a new FAQ entry.

**Request body:**

```json
{
  "category": "Shipping",
  "question": "How long does delivery take?",
  "answer": "Lagos orders arrive in 1-2 business days. Other states take 2-4 business days.",
  "display_order": 0
}
```

`category`, `question`, and `answer` are required. `display_order` defaults to `0`.

**Success response — `201 Created`:**

```json
{ "faq": { ...faq_row } }
```

---

#### `PUT /api/admin/faqs/[id]`

Partially updates a FAQ. Only fields provided in the body are changed.

**Request body:** Any subset of `category`, `question`, `answer`, `display_order`.

**Success response — `200 OK`:**

```json
{ "ok": true }
```

**Error responses:**

| Status | Body | Cause |
|--------|------|-------|
| `401` | `{ "error": "Unauthorized" }` | No valid admin session |
| `404` | `{ "error": "FAQ not found" }` | No FAQ with the given `id` |

---

#### `DELETE /api/admin/faqs/[id]`

Permanently deletes a FAQ entry.

**Success response — `200 OK`:**

```json
{ "ok": true }
```

**Error responses:** Same as `PUT` (including `404`).

---

### Reviews

#### `POST /api/admin/reviews`

Creates a product review. Reviews are admin-managed (no public submission endpoint).

**Request body:**

```json
{
  "product_id": "uuid",
  "author_name": "Nkechi B.",
  "body": "Absolutely love these beads. Great quality and fast delivery!",
  "rating": 5
}
```

`product_id`, `author_name`, `body`, and `rating` are all required. `rating` must be an integer between 1 and 5 inclusive.

**Success response — `201 Created`:** The full review row.

**Error responses:**

| Status | Body | Cause |
|--------|------|-------|
| `400` | `{ "error": "rating must be an integer between 1 and 5" }` | Rating out of range or not an integer |
| `401` | `{ "error": "Unauthorized" }` | No valid admin session |

---

#### `PUT /api/admin/reviews/[id]`

Updates a review's `author_name`, `body` (passed as `reviewBody`), and `rating`.

**Request body:**

```json
{
  "author_name": "Nkechi B.",
  "reviewBody": "Updated review text.",
  "rating": 4
}
```

Note: the body field is named `reviewBody` in PUT requests (to avoid collision with the built-in `body` property in the route handler).

**Success response — `200 OK`:** The updated review row.

---

#### `DELETE /api/admin/reviews/[id]`

Permanently deletes a review.

**Success response — `204 No Content`:** Empty body.

---

### Settings

#### `PUT /api/admin/settings`

Upserts one or more key-value settings into the `settings` table. All values must be strings. Existing keys are updated; new keys are inserted.

**Request body:**

```json
{
  "hero_title": "Elevate Your Locs",
  "hero_subtitle": "Premium loc beads handpicked for you"
}
```

**Success response — `200 OK`:**

```json
{ "updated": ["hero_title", "hero_subtitle"] }
```

An empty object body returns `200 { "updated": [] }` with no database writes.

**Error responses:**

| Status | Body | Cause |
|--------|------|-------|
| `400` | `{ "error": "Body must be a key-value object" }` | Body is not an object |
| `400` | `{ "error": "Value for key \"<key>\" must be a string" }` | A value is not a string |
| `401` | `{ "error": "Unauthorized" }` | No valid admin session |

---

### Shipping Settings

#### `PUT /api/admin/shipping`

Upserts shipping configuration into the `settings` table. Only the six allowlisted shipping keys are accepted; any other keys are silently ignored.

**Allowed keys:**

| Key | Description |
|-----|-------------|
| `shipping_lagos_rate` | Lagos flat rate (Naira, stored as string) |
| `shipping_other_rate` | All other states flat rate (Naira, stored as string) |
| `shipping_lagos_days` | Lagos estimated delivery days (display string) |
| `shipping_other_days` | Other states estimated delivery days (display string) |
| `shipping_intl_message` | International shipping message shown on the shipping page |
| `shipping_page_intro` | Introductory text on the shipping information page |

**Request body:**

```json
{
  "shipping_lagos_rate": "3000",
  "shipping_other_rate": "4500",
  "shipping_lagos_days": "1-2 business days",
  "shipping_other_days": "2-4 business days"
}
```

**Success response — `200 OK`:**

```json
{ "updated": ["shipping_lagos_rate", "shipping_other_rate", "shipping_lagos_days", "shipping_other_days"] }
```

**Error responses:** Same as `PUT /api/admin/settings`.

> **Note:** The actual shipping cost applied at checkout is computed by `getShippingCost()` in `src/lib/checkout/shipping.ts`, which is currently hardcoded (Lagos: ₦3,000; all other states: ₦4,500). The `shipping_lagos_rate` and `shipping_other_rate` settings keys exist for display purposes on the storefront shipping page; they do not affect the server-side cost calculation.

---

## Error Codes

All endpoints return errors as JSON objects with an `error` string field.

| HTTP Status | Meaning |
|-------------|---------|
| `400` | Bad request — missing or invalid fields in the request body |
| `401` | Unauthorized — missing admin session (admin routes) or invalid Paystack HMAC signature (webhook) |
| `404` | Not found — the requested resource does not exist |
| `409` | Conflict — unique constraint violation (duplicate email, duplicate slug) |
| `500` | Internal server error — Supabase write failure; logged server-side with `console.error` |

---

## Rate Limits

No application-level rate limiting is configured. <!-- VERIFY: Supabase project-level rate limits or any CDN/proxy rate limiting applied in production -->
