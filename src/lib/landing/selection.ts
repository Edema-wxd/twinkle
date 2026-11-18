import type { ProductMaterial, ProductVariant } from '@/lib/types/product'
import type { PopularChoice } from '@/lib/products/popularChoice'
import { THREAD_COLOURS } from '@/lib/cart/threadColours'
import { firstFittingTier, packFits } from '@/lib/stockDisplay'
import type { FeaturedProductConfig } from './config'

/**
 * Landing page product cards: which size, pack and thread start selected, and the
 * numbers shown under the price. Client-safe (no DB), so the server picks the
 * default and the card recomputes prices from the same rules as the user taps.
 */

/** Thread colour for people who don't pick one, when there are no sales to go by (same as the product page) */
export const DEFAULT_THREAD = 'black'

export type Selection = { variantId: string; tierQty: number; thread: string }

const isThread = (id: string | null | undefined): id is string => !!id && THREAD_COLOURS.some((c) => c.id === id)

/** "4mm", "4 mm" and "4MM" are the same size */
const sameSize = (a: string, b: string) => a.replace(/\s+/g, '').toLowerCase() === b.replace(/\s+/g, '').toLowerCase()

/** The variant has this pack size and enough stock for it */
export function tierFits(variant: ProductVariant | undefined, tierQty: number): boolean {
  return !!variant && variant.price_tiers.some((t) => t.qty === tierQty) && packFits(variant, tierQty)
}

/**
 * The card's preselected options, in this order:
 * 1. the real best-seller from paid orders (first popular pack that's in stock and fits, as on the product page),
 * 2. the admin's fallback (size by variant name, pack by beads per pack, thread by colour id),
 * 3. the first in-stock size and its first pack that fits.
 * Thread: the best-selling colour, else the fallback colour, else black. Tools have no thread.
 */
export function resolveDefaultSelection(
  product: { material: ProductMaterial; variants: ProductVariant[] },
  popular: PopularChoice | null,
  fallback: FeaturedProductConfig['fallback'] | null,
): Selection {
  const { variants } = product
  const byId = (id: string) => variants.find((v) => v.id === id)

  let variant: ProductVariant | undefined
  let tierQty: number | undefined

  const popularPack = popular?.packs.find((p) => tierFits(byId(p.variantId), p.tierQty))
  if (popularPack) {
    variant = byId(popularPack.variantId)
    tierQty = popularPack.tierQty
  } else {
    const size = fallback?.size
    variant =
      (size ? variants.find((v) => v.in_stock && sameSize(v.name, size)) : undefined) ?? variants.find((v) => v.in_stock) ?? variants[0]
    const pack = fallback?.pack
    tierQty = pack && tierFits(variant, pack) ? pack : firstFittingTier(variant)
  }

  const thread =
    product.material === 'Tools'
      ? ''
      : isThread(popular?.threadColour)
        ? popular!.threadColour!
        : isThread(fallback?.thread)
          ? fallback!.thread!
          : DEFAULT_THREAD

  return { variantId: variant?.id ?? '', tierQty: tierQty ?? 0, thread }
}

/**
 * Price of the selected size and pack, worked out exactly like the product page
 * (tier price, else the variant's price, else the product's lowest price), so the
 * card always matches what the product page and checkout charge.
 */
export function selectionPrice(product: { variants: ProductVariant[]; price_min: number }, sel: Pick<Selection, 'variantId' | 'tierQty'>): number {
  const variant = product.variants.find((v) => v.id === sel.variantId)
  return variant?.price_tiers.find((t) => t.qty === sel.tierQty)?.price ?? variant?.price ?? product.price_min
}

/** "₦189 per bead", only for packs bigger than the smallest one this size comes in */
export function perBeadPrice(variant: ProductVariant | undefined, tierQty: number): number | null {
  if (!variant || tierQty <= 0) return null
  const tier = variant.price_tiers.find((t) => t.qty === tierQty)
  if (!tier) return null
  const smallest = Math.min(...variant.price_tiers.map((t) => t.qty))
  if (tierQty <= smallest) return null
  return tier.price / tierQty
}

/** Whole packs of this size left, when stock is tracked; null when it isn't */
export function packsLeft(variant: ProductVariant | undefined, tierQty: number): number | null {
  if (!variant || variant.stock == null || tierQty <= 0) return null
  return Math.floor(variant.stock / tierQty)
}

/** Product names without emoji (the ✨ in "Gold Twinkles ✨"), for headings and buttons on the landing page */
export function cleanProductName(name: string): string {
  return name
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function formatNaira(n: number): string {
  return '₦' + Math.round(n).toLocaleString('en-NG')
}

/** Per-bead prices: whole naira, or one decimal under ₦10 */
export function formatPerBead(n: number): string {
  return n < 10 ? '₦' + n.toFixed(1) : formatNaira(n)
}
