import type { ProductVariant } from '@/lib/types/product'

/** Client-safe stock helpers (no DB). Stock is counted in beads, or items for Tools. */

export function packFits(variant: ProductVariant | undefined, tierQty: number): boolean {
  if (!variant || !variant.in_stock) return false
  return variant.stock == null || tierQty <= variant.stock
}

/** First pack size this variant can still supply (falls back to the first tier). */
export function firstFittingTier(variant: ProductVariant | undefined): number {
  if (!variant) return 0
  return (variant.price_tiers.find((t) => packFits(variant, t.qty)) ?? variant.price_tiers[0])?.qty ?? 0
}

/** "Only 120 beads left in 4mm", shown when a tracked size is running low. */
export function lowStockLabel(variant: ProductVariant | undefined, isTool: boolean): string | null {
  if (!variant || variant.stock == null || !variant.in_stock) return null
  const biggest = Math.max(1, ...variant.price_tiers.map((t) => t.qty))
  const low = isTool ? variant.stock <= 5 : variant.stock < biggest * 2
  if (!low) return null
  return isTool ? `Only ${variant.stock} left` : `Only ${variant.stock.toLocaleString()} beads left in ${variant.name}`
}
