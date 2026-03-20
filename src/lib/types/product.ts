export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  in_stock: boolean;
}

export type ProductMaterial = 'Gold' | 'Silver' | 'Crystal' | 'Tools';

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  material: ProductMaterial;
  is_featured: boolean;
  variants: ProductVariant[];
  price_min: number;
  price_max: number;
  created_at: string; // ISO 8601 string — from Supabase or static mock value
}
