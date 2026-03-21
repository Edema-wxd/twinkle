export interface Review {
  id: string
  product_id: string
  author_name: string
  body: string
  rating: number  // 1–5
  created_at: string
}
