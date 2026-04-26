import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  jsonb,
  numeric,
  timestamp,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull().default(''),
  seoDescription: text('seo_description'),
  image: text('image').notNull().default('/images/products/placeholder-bead.svg'),
  images: text('images').array().notNull().default([]),
  material: text('material').notNull(),
  isFeatured: boolean('is_featured').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  priceMin: integer('price_min').notNull(),
  priceMax: integer('price_max').notNull(),
  variants: jsonb('variants').notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  authorName: text('author_name').notNull(),
  body: text('body').notNull(),
  rating: integer('rating').notNull(), // CHECK (rating BETWEEN 1 AND 5) — added via raw SQL after push
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  paystackReference: text('paystack_reference').notNull().unique(),
  paystackPayload: jsonb('paystack_payload').notNull(),
  status: text('status').notNull().default('paid'),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  customerPhone: text('customer_phone').notNull(),
  customerIp: text('customer_ip'),
  deliveryAddress: text('delivery_address').notNull(),
  deliveryState: text('delivery_state').notNull(),
  shippingCost: integer('shipping_cost').notNull(), // KOBO — integer, not numeric
  subtotal: integer('subtotal').notNull(),
  total: integer('total').notNull(),
})

export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  productId: uuid('product_id').notNull(),
  productName: text('product_name').notNull(),
  variantId: text('variant_id').notNull(),
  variantName: text('variant_name').notNull(),
  tierQty: integer('tier_qty').notNull(),
  threadColour: text('thread_colour'), // null for Tools
  unitPrice: integer('unit_price').notNull(),
  quantity: integer('quantity').notNull(),
  lineTotal: integer('line_total').notNull(),
})

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})

export const aboutSections = pgTable('about_sections', {
  id: text('id').primaryKey(), // text PK, not uuid — values are 'founder-story' | 'brand-mission' | 'why-loc-beads' | 'contact'
  title: text('title').notNull(),
  body: text('body').notNull(),
  imageUrl: text('image_url'),
  displayOrder: integer('display_order').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const faqs = pgTable('faqs', {
  id: uuid('id').primaryKey().defaultRandom(),
  category: text('category').notNull(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  displayOrder: integer('display_order').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const blogPosts = pgTable('blog_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  body: text('body').notNull(),
  excerpt: text('excerpt').notNull(),
  featuredImage: text('featured_image'),
  tag: text('tag'),
  published: boolean('published').notNull().default(false),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  id: uuid('id').primaryKey().defaultRandom(),
  firstName: text('first_name').notNull(),
  email: text('email').notNull().unique(),
  sourcePage: text('source_page'),
  subscribedAt: timestamp('subscribed_at', { withTimezone: true }).notNull().defaultNow(),
})

export const abandonedOrders = pgTable('abandoned_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  customerPhone: text('customer_phone').notNull(),
  deliveryAddress: text('delivery_address').notNull(),
  deliveryState: text('delivery_state').notNull(),
  shippingCost: numeric('shipping_cost', { precision: 10, scale: 2 }).notNull(), // NUMERIC(10,2) per migration
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
  total: numeric('total', { precision: 10, scale: 2 }).notNull(),
  cartItems: jsonb('cart_items').notNull(),
  recovered: boolean('recovered').notNull().default(false),
  recoveredAt: timestamp('recovered_at', { withTimezone: true }),
})

// Drizzle relations for nested queries (orders → orderItems used by /orders/[reference])
export const ordersRelations = relations(orders, ({ many }) => ({
  orderItems: many(orderItems),
}))

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}))

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
}))
