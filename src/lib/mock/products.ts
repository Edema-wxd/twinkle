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
      { id: 'var_001a', name: 'Small (4mm)', price: 2500, in_stock: true },
      { id: 'var_001b', name: 'Medium (6mm)', price: 3200, in_stock: true },
      { id: 'var_001c', name: 'Large (8mm)', price: 4000, in_stock: false },
    ],
    price_min: 2500,
    price_max: 4000,
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
      { id: 'var_002a', name: 'Small (4mm)', price: 1800, in_stock: true },
      { id: 'var_002b', name: 'Medium (6mm)', price: 2400, in_stock: true },
      { id: 'var_002c', name: 'Large (8mm)', price: 3000, in_stock: false },
    ],
    price_min: 1800,
    price_max: 3000,
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
      { id: 'var_003a', name: 'Small (4mm)', price: 1800, in_stock: true },
      { id: 'var_003b', name: 'Medium (6mm)', price: 2400, in_stock: true },
      { id: 'var_003c', name: 'Large (8mm)', price: 3000, in_stock: false },
    ],
    price_min: 1800,
    price_max: 3000,
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
      { id: 'var_004a', name: 'Small (4mm)', price: 2000, in_stock: true },
      { id: 'var_004b', name: 'Medium (6mm)', price: 2600, in_stock: true },
      { id: 'var_004c', name: 'Large (8mm)', price: 3200, in_stock: false },
    ],
    price_min: 2000,
    price_max: 3200,
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
      { id: 'var_005a', name: 'Small (4mm)', price: 1600, in_stock: true },
      { id: 'var_005b', name: 'Medium (6mm)', price: 2200, in_stock: true },
      { id: 'var_005c', name: 'Large (8mm)', price: 2800, in_stock: true },
    ],
    price_min: 1600,
    price_max: 2800,
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
