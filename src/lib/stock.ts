import { and, eq, gte, inArray, notInArray, sql } from 'drizzle-orm'
import { db, productStock } from '@/db'
import type { ProductVariant } from '@/lib/types/product'

/**
 * Stock counts, per product variant (size), in beads (or items for Tools).
 * A pack of 100 uses 100 units. A variant with no stock row isn't tracked and
 * behaves as before: its `in_stock` tick box decides.
 *
 * Every page that shows products overlays these counts with `withStock()`, so
 * a size sells out the moment its last pack goes, with no one editing the product.
 */

type StockKey = `${string}:${string}`
const key = (productId: string, variantId: string): StockKey => `${productId}:${variantId}`

export async function getStockMap(productIds: string[]): Promise<Map<StockKey, number>> {
  const ids = [...new Set(productIds)]
  const map = new Map<StockKey, number>()
  if (ids.length === 0) return map
  try {
    const rows = await db.select().from(productStock).where(inArray(productStock.productId, ids))
    for (const r of rows) map.set(key(r.productId, r.variantId), r.units)
  } catch (err) {
    // Missing table (schema not pushed yet) or DB hiccup: fall back to the in_stock flags
    console.error('[stock] Failed to load stock, falling back to in_stock flags:', err)
  }
  return map
}

/** Smallest pack a customer can buy for this variant (1 when it has no tiers). */
export function smallestPack(v: Pick<ProductVariant, 'price_tiers'>): number {
  const qtys = (v.price_tiers ?? []).map((t) => t.qty).filter((q) => q > 0)
  return qtys.length ? Math.min(...qtys) : 1
}

/**
 * Overlay live stock onto a product's variants: adds `stock` and turns
 * `in_stock` off once fewer units remain than the smallest pack.
 * The admin's in_stock tick box still wins when it's off (manual hide).
 */
export function withStock(productId: string, variants: ProductVariant[], map: Map<StockKey, number>): ProductVariant[] {
  return variants.map((v) => {
    const units = map.get(key(productId, v.id))
    if (units === undefined) return { ...v, stock: null }
    return { ...v, stock: units, in_stock: v.in_stock && units >= smallestPack(v) }
  })
}

/** Convenience: overlay stock for many products at once. */
export async function applyStockToProducts<T extends { id: string; variants: ProductVariant[] }>(list: T[]): Promise<T[]> {
  const map = await getStockMap(list.map((p) => p.id))
  return list.map((p) => ({ ...p, variants: withStock(p.id, p.variants, map) }))
}

// ── Admin ────────────────────────────────────────────────────────────────────

/** Set (number) or stop tracking (null) a variant's stock. */
export async function setStock(productId: string, variantId: string, units: number | null) {
  if (units === null) {
    await db.delete(productStock).where(and(eq(productStock.productId, productId), eq(productStock.variantId, variantId)))
    return
  }
  const clean = Math.max(0, Math.floor(units))
  await db
    .insert(productStock)
    .values({ productId, variantId, units: clean })
    .onConflictDoUpdate({
      target: [productStock.productId, productStock.variantId],
      set: { units: clean, updatedAt: new Date() },
    })
}

/** Drop stock rows for variants that no longer exist on the product. */
export async function pruneStock(productId: string, keepVariantIds: string[]) {
  await db
    .delete(productStock)
    .where(
      keepVariantIds.length
        ? and(eq(productStock.productId, productId), notInArray(productStock.variantId, keepVariantIds))
        : eq(productStock.productId, productId),
    )
}

// ── Orders ───────────────────────────────────────────────────────────────────

export type StockNeed = { productId: string; variantId: string; units: number; label: string }

/** Combine lines that draw on the same variant (e.g. two thread colours of the same size). */
export function aggregateNeeds(lines: { productId: string; variantId: string; tierQty: number; quantity: number; label: string }[]): StockNeed[] {
  const byKey = new Map<StockKey, StockNeed>()
  for (const l of lines) {
    const k = key(l.productId, l.variantId)
    const units = Math.max(1, l.tierQty) * Math.max(0, l.quantity)
    const prev = byKey.get(k)
    if (prev) prev.units += units
    else byKey.set(k, { productId: l.productId, variantId: l.variantId, units, label: l.label })
  }
  return [...byKey.values()]
}

/**
 * Take stock for a paid order. Each decrement is a single conditional UPDATE
 * (`units >= need`), so two simultaneous orders can never both take the last
 * beads: Postgres row locking makes the second one see the first one's result.
 * Untracked variants are skipped. Returns the needs that couldn't be met.
 */
export async function takeStock(needs: StockNeed[]): Promise<{ need: StockNeed; available: number }[]> {
  const shortfalls: { need: StockNeed; available: number }[] = []
  for (const need of needs) {
    const updated = await db
      .update(productStock)
      .set({ units: sql`${productStock.units} - ${need.units}`, updatedAt: new Date() })
      .where(
        and(
          eq(productStock.productId, need.productId),
          eq(productStock.variantId, need.variantId),
          gte(productStock.units, need.units),
        ),
      )
      .returning({ units: productStock.units })
    if (updated.length > 0) continue

    const [row] = await db
      .select({ units: productStock.units })
      .from(productStock)
      .where(and(eq(productStock.productId, need.productId), eq(productStock.variantId, need.variantId)))
      .limit(1)
    if (row) shortfalls.push({ need, available: row.units }) // tracked but not enough
  }
  return shortfalls
}
