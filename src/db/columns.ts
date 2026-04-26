import {
  products,
  reviews,
  orders,
  orderItems,
  settings,
  aboutSections,
  faqs,
  blogPosts,
  newsletterSubscribers,
  abandonedOrders,
} from './schema'

// Row types (replace Database['public']['Tables']['X']['Row'])
export type Product = typeof products.$inferSelect
export type ProductInsert = typeof products.$inferInsert
export type Review = typeof reviews.$inferSelect
export type ReviewInsert = typeof reviews.$inferInsert
export type Order = typeof orders.$inferSelect
export type OrderInsert = typeof orders.$inferInsert
export type OrderItem = typeof orderItems.$inferSelect
export type OrderItemInsert = typeof orderItems.$inferInsert
export type Setting = typeof settings.$inferSelect
export type AboutSection = typeof aboutSections.$inferSelect
export type AboutSectionInsert = typeof aboutSections.$inferInsert
export type Faq = typeof faqs.$inferSelect
export type FaqInsert = typeof faqs.$inferInsert
export type BlogPost = typeof blogPosts.$inferSelect
export type BlogPostInsert = typeof blogPosts.$inferInsert
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect
export type AbandonedOrder = typeof abandonedOrders.$inferSelect
export type AbandonedOrderInsert = typeof abandonedOrders.$inferInsert

// Json type re-export for files that import Json from @/types/supabase
export type Json = unknown
