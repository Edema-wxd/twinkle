export interface MockProductVariant {
  id: string;
  name: string;
  price: number;
  in_stock: boolean;
}

export interface MockProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  is_featured: boolean;
  variants: MockProductVariant[];
  price_min: number;
  price_max: number;
}

export const FEATURED_PRODUCTS: MockProduct[] = [
  {
    id: "prod_001",
    name: "24K Gold Beads",
    slug: "24k-gold-beads",
    description:
      "Lustrous 24K gold-plated loc beads — the signature Twinkle Locs piece.",
    image: "/images/products/placeholder-bead.svg",
    is_featured: true,
    variants: [
      { id: "var_001a", name: "Small (4mm)", price: 2500, in_stock: true },
      { id: "var_001b", name: "Medium (6mm)", price: 3200, in_stock: true },
      { id: "var_001c", name: "Large (8mm)", price: 4000, in_stock: false },
    ],
    price_min: 2500,
    price_max: 4000,
  },
  {
    id: "prod_002",
    name: "Gold Beads",
    slug: "gold-beads",
    description: "Classic gold-toned loc beads for everyday glamour.",
    image: "/images/products/placeholder-bead.svg",
    is_featured: true,
    variants: [
      { id: "var_002a", name: "Small (4mm)", price: 1800, in_stock: true },
      { id: "var_002b", name: "Medium (6mm)", price: 2400, in_stock: true },
      { id: "var_002c", name: "Large (8mm)", price: 3000, in_stock: false },
    ],
    price_min: 1800,
    price_max: 3000,
  },
  {
    id: "prod_003",
    name: "Silver Beads",
    slug: "silver-beads",
    description:
      "Cool silver-toned loc beads — perfect for contemporary styles.",
    image: "/images/products/placeholder-bead.svg",
    is_featured: true,
    variants: [
      { id: "var_003a", name: "Small (4mm)", price: 1800, in_stock: true },
      { id: "var_003b", name: "Medium (6mm)", price: 2400, in_stock: true },
      { id: "var_003c", name: "Large (8mm)", price: 3000, in_stock: false },
    ],
    price_min: 1800,
    price_max: 3000,
  },
  {
    id: "prod_004",
    name: "Onyx Beads",
    slug: "onyx-beads",
    description: "Deep onyx loc beads for a bold, statement look.",
    image: "/images/products/placeholder-bead.svg",
    is_featured: true,
    variants: [
      { id: "var_004a", name: "Small (4mm)", price: 2000, in_stock: true },
      { id: "var_004b", name: "Medium (6mm)", price: 2600, in_stock: true },
      { id: "var_004c", name: "Large (8mm)", price: 3200, in_stock: false },
    ],
    price_min: 2000,
    price_max: 3200,
  },
];
