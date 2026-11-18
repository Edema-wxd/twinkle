import type { ProductVariant } from '@/lib/types/product'
import { naira } from '@/lib/checkout/freeDelivery'

/**
 * Human-readable price and delivery copy, worked out from real product data and
 * Admin → Shipping, so meta descriptions, llms.txt and the product page never
 * quote a stale hard-coded figure. Pure (no database), safe on server and client.
 *
 * schema.org fields stay ISO/numeric (priceCurrency 'NGN', lowPrice 15500);
 * only text people read uses ₦.
 */

export { naira }

type Priced = {
  price_min: number
  material?: string
  variants?: Pick<ProductVariant, 'in_stock' | 'price' | 'price_tiers'>[] | null
}

/** Lowest price someone can actually pay for this product: cheapest pack of a size that's in stock. Falls back to price_min. */
export function fromPrice(p: Priced): number | null {
  const prices = (p.variants ?? [])
    .filter((v) => v.in_stock)
    .flatMap((v) => (v.price_tiers?.length ? v.price_tiers.map((t) => t.price) : [v.price]))
    .filter((n) => typeof n === 'number' && n > 0)
  if (prices.length) return Math.min(...prices)
  return p.price_min > 0 ? p.price_min : null
}

/** Lowest "from" price across several products (null when none has a price). */
export function lowestFromPrice(products: Priced[]): number | null {
  const prices = products.map(fromPrice).filter((n): n is number => n !== null)
  return prices.length ? Math.min(...prices) : null
}

/** "₦3,500 - ₦103,000" for the Store JSON-LD priceRange (null when there's nothing to quote). */
export function priceRangeText(products: (Priced & { price_max: number })[]): string | null {
  const low = lowestFromPrice(products)
  const highs = products.map((p) => p.price_max).filter((n) => n > 0)
  if (low === null || highs.length === 0) return null
  const high = Math.max(...highs)
  return high > low ? `${naira(low)} - ${naira(high)}` : naira(low)
}

/** The delivery line under every Add to cart: "Lagos from ₦3,000, same day in most areas · Nationwide 3–5 business days". */
export function deliveryLine(lagosFrom: number, otherDays: string): string {
  return `Lagos from ${naira(lagosFrom)}, same day in most areas · Nationwide ${otherDays}`
}
