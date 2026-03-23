import { Product } from '@/lib/types/product';

// Backward compatibility for any imports that still use MockProduct
export type { Product as MockProduct } from '@/lib/types/product';

export const CATALOG_PRODUCTS: Product[] = [
  {
    id: 'prod_001',
    name: '24K Gold Beads',
    slug: '24k-gold-beads',
    description: 'Lustrous 24K gold-plated loc beads — the signature Twinkle Locs piece.',
    image: '/images/products/placeholder-bead.svg',
    material: 'Gold',
    is_featured: true,
    variants: [
      { id: 'var_001a', name: '2mm', price: 19500, in_stock: true },
    ],
    price_min: 19500,
    price_max: 19500,
    created_at: '2024-06-01T10:00:00.000Z',
  },
  {
    id: 'prod_002',
    name: 'Gold Beads',
    slug: 'gold-beads',
    description: 'Classic gold-toned loc beads for everyday glamour.',
    image: '/images/products/placeholder-bead.svg',
    material: 'Gold',
    is_featured: true,
    variants: [
      { id: 'var_002a', name: '2mm', price: 18435, in_stock: true },
      { id: 'var_002b', name: '4mm', price: 13590, in_stock: true },
      { id: 'var_002c', name: '6mm', price: 15885, in_stock: true },
    ],
    price_min: 13590,
    price_max: 18435,
    created_at: '2024-05-15T10:00:00.000Z',
  },
  {
    id: 'prod_003',
    name: 'Silver Beads',
    slug: 'silver-beads',
    description: 'Cool silver-toned loc beads — perfect for contemporary styles.',
    image: '/images/products/placeholder-bead.svg',
    material: 'Silver',
    is_featured: true,
    variants: [
      { id: 'var_003a', name: '2mm', price: 18350, in_stock: true },
      { id: 'var_003b', name: '4mm', price: 13590, in_stock: true },
      { id: 'var_003c', name: '6mm', price: 15885, in_stock: true },
    ],
    price_min: 13590,
    price_max: 18350,
    created_at: '2024-04-20T10:00:00.000Z',
  },
  {
    id: 'prod_004',
    name: 'Onyx Beads',
    slug: 'onyx-beads',
    description: 'Deep onyx loc beads for a bold, statement look.',
    image: '/images/products/placeholder-bead.svg',
    material: 'Crystal',
    is_featured: true,
    variants: [
      { id: 'var_004a', name: '2mm', price: 16225, in_stock: true },
      { id: 'var_004b', name: '4mm', price: 13590, in_stock: true },
      { id: 'var_004c', name: '6mm', price: 15885, in_stock: true },
    ],
    price_min: 13590,
    price_max: 16225,
    created_at: '2024-03-10T10:00:00.000Z',
  },
  {
    id: 'prod_005',
    name: 'Crystal Clear Beads',
    slug: 'crystal-clear-beads',
    description: 'Transparent crystal loc beads — catches the light beautifully.',
    image: '/images/products/placeholder-bead.svg',
    material: 'Crystal',
    is_featured: false,
    variants: [
      { id: 'var_005a', name: '2mm', price: 14950, in_stock: true },
      { id: 'var_005b', name: '4mm', price: 13590, in_stock: true },
      { id: 'var_005c', name: '6mm', price: 15885, in_stock: true },
    ],
    price_min: 13590,
    price_max: 15885,
    created_at: '2024-02-14T10:00:00.000Z',
  },
  {
    id: 'prod_006',
    name: 'Shears',
    slug: 'shears',
    description: 'Professional loc shears — precision-crafted for clean, sharp cuts.',
    image: '/images/products/placeholder-bead.svg',
    material: 'Tools',
    is_featured: false,
    variants: [
      { id: 'var_006a', name: 'Standard', price: 3500, in_stock: true },
    ],
    price_min: 3500,
    price_max: 3500,
    created_at: '2024-01-01T10:00:00.000Z',
  },
];

export const FEATURED_PRODUCTS: Product[] = CATALOG_PRODUCTS.filter(
  (p) => p.is_featured
);
