# Phase 6: Admin Panel - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Protected /admin interface where Unoma (the store owner) can manage all products, orders, and customer reviews without touching any code. Includes a dashboard with sales stats, full product CRUD with image upload, order status management, review entry, and a settings section for business details. Unauthenticated visitors are redirected away.

</domain>

<decisions>
## Implementation Decisions

### Navigation & layout
- Fixed left sidebar with sections: Dashboard, Products, Orders, Reviews, Settings, + Logout button at the bottom
- Blog and Subscribers sidebar links are deferred — added when those phases are built
- Dashboard home shows: stats panel (Total sales ₦, order count) with date range tabs (Today / This week / This month) + a table of the last 5–10 orders with status
- Admin uses on-brand styling: Twinkle Locs palette and Halimun font — feels cohesive with the storefront
- Fully mobile-responsive admin (Unoma may check orders on her phone)
- Admin header shows current page/section title

### Product editing
- Single-page form: name, description, price, variants, images — all on one screen with Save at bottom
- Variants are a flat editable table: each row has Name + Price (₦) + Stock + delete button; rows can be added inline with "+ Add variant"
- After saving a product, return to the product list with a success toast
- Product list supports search by name + filter by category/status
- Products can be toggled active or archived (hidden from storefront without deleting)
- Description uses a rich text editor: bold, italic, bullet lists
- After saving, a "View on storefront" link appears to open the live product page in a new tab (no live preview panel)
- Deleting a product requires a simple "Are you sure?" confirm dialog

### Image upload
- Up to ~5 images per product; first image in upload order is the product card thumbnail
- Drag-and-drop zone that also supports click-to-upload
- Uploaded images show as draggable thumbnails immediately — Unoma can reorder (drag to set primary) and remove before saving
- Images stored in Supabase Storage

### Order management
- Order list table columns: Order # | Customer name | Date | Total (₦) | Status
- Status updated via a dropdown directly in the table row — no need to open the order detail
- Filter orders by status tabs at top: All / Pending / Shipped / Delivered
- Order detail view shows full delivery address + customer WhatsApp number

### Business settings (Settings section)
- Settings section covers: Store name & tagline, address, email; WhatsApp number; Shipping rates (per-state or flat-rate); Social media links (Instagram, TikTok, Facebook)
- Changes take effect immediately on the storefront — settings read from database at runtime, no redeploy needed
- Admin is the single source of truth for all business content — no env vars or code changes needed for these values

### Claude's Discretion
- Exact rich text editor library choice
- Drag-to-reorder implementation for images
- Loading/skeleton states and error handling patterns
- Exact sidebar collapse behaviour on mobile
- Toast notification styling

</decisions>

<specifics>
## Specific Ideas

- Variants should feel like a spreadsheet-style inline table — add a row, type directly into the cells
- Settings changes go live immediately — Unoma should be able to update the WhatsApp number and see it reflected on the storefront without any developer involvement

</specifics>

<deferred>
## Deferred Ideas

- Blog management sidebar link — Phase 7 (Blog/Content)
- Subscribers list sidebar link — Phase 8 (Newsletter)
- Bulk product actions (bulk archive, bulk delete) — future enhancement
- Order search by customer name or order number — future enhancement
- Export orders to CSV — future enhancement

</deferred>

---

*Phase: 06-admin-panel*
*Context gathered: 2026-03-24*
