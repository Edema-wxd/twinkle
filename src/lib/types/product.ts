export interface PriceTier {
  qty: number;   // pack size in number of beads (e.g. 25, 50, 100, 150, 200)
  price: number; // price in kobo-less Naira for this pack size
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;              // lowest available tier price (display/sort price)
  in_stock: boolean;
  price_tiers: PriceTier[];   // all available pack sizes with their prices
}

export type ProductMaterial = 'Gold' | 'Silver' | 'Crystal' | 'Tools';

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  seo_description?: string | null;
  image: string;
  /** Full gallery URLs — if absent, gallery uses [image] as fallback */
  images?: string[];
  material: ProductMaterial;
  is_featured: boolean;
  variants: ProductVariant[];
  price_min: number;
  price_max: number;
  created_at: string; // ISO 8601 string — from Supabase or static mock value
}
