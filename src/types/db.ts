export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// These types intentionally preserve the existing "snake_case" DTO shapes used across
// UI components/pages. They are database-agnostic (no Supabase dependency) and act as
// stable view-model contracts while the data layer is implemented with Drizzle/Neon.

export type Product = {
  id: string
  name: string
  slug: string
  description: string
  seo_description: string | null
  image: string
  images: string[]
  material: string
  is_featured: boolean
  is_active: boolean
  price_min: number
  price_max: number
  variants: Json
  created_at: string
}

export type Review = {
  id: string
  product_id: string
  author_name: string
  body: string
  rating: number
  created_at: string
}

export type Order = {
  id: string
  created_at: string
  paystack_reference: string
  paystack_payload: Json
  status: string
  customer_name: string
  customer_email: string
  customer_phone: string
  customer_ip: string | null
  delivery_address: string
  delivery_state: string
  shipping_cost: number
  subtotal: number
  total: number
}

export type OrderItem = {
  id: string
  order_id: string
  created_at: string
  product_id: string
  product_name: string
  variant_id: string
  variant_name: string
  tier_qty: number
  thread_colour: string | null
  unit_price: number
  quantity: number
  line_total: number
}

export type Setting = {
  key: string
  value: string
}

export type AboutSection = {
  id: string
  title: string
  body: string
  image_url: string | null
  display_order: number
  updated_at: string
}

export type Faq = {
  id: string
  category: string
  question: string
  answer: string
  display_order: number
  created_at: string
}

export type BlogPost = {
  id: string
  title: string
  slug: string
  body: string
  excerpt: string
  featured_image: string | null
  tag: string | null
  published: boolean
  published_at: string | null
  created_at: string
  updated_at: string
}

export type NewsletterSubscriber = {
  id: string
  first_name: string
  email: string
  source_page: string | null
  subscribed_at: string
}

export type AbandonedOrder = {
  id: string
  created_at: string
  customer_name: string
  customer_email: string
  customer_phone: string
  delivery_address: string
  delivery_state: string
  shipping_cost: number
  subtotal: number
  total: number
  cart_items: Json
  recovered: boolean
  recovered_at: string | null
}

// Minimal compatibility helper for legacy `Tables<'table'>` usage.
export type Tables<T extends string> =
  T extends 'products' ? Product :
  T extends 'reviews' ? Review :
  T extends 'orders' ? Order :
  T extends 'order_items' ? OrderItem :
  T extends 'settings' ? Setting :
  T extends 'about_sections' ? AboutSection :
  T extends 'faqs' ? Faq :
  T extends 'blog_posts' ? BlogPost :
  T extends 'newsletter_subscribers' ? NewsletterSubscriber :
  T extends 'abandoned_orders' ? AbandonedOrder :
  never

