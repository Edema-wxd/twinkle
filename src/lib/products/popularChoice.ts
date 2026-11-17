import { and, desc, eq, inArray, isNotNull, ne, sql } from 'drizzle-orm'
import { db, orderItems, orders } from '@/db'

/** Orders that count as real sales (not ones held for a payment check) */
const SOLD = ['paid', 'processing', 'shipped', 'delivered']

export type PopularChoice = {
  /** Most-bought size and pack of this product, best first (the page picks the first one in stock) */
  packs: { variantId: string; tierQty: number }[]
  /** Most-bought thread colour across all beads */
  threadColour: string | null
}

/**
 * What customers buy most, so the product page can pre-select it and someone
 * arriving from an ad can add to cart in one tap. Never throws: with no sales
 * yet (or a database hiccup) the page falls back to sensible defaults.
 */
export async function popularChoice(productId: string): Promise<PopularChoice> {
  try {
    const units = sql<number>`sum(${orderItems.quantity})::int`
    const [packs, colours] = await Promise.all([
      db
        .select({ variantId: orderItems.variantId, tierQty: orderItems.tierQty, units })
        .from(orderItems)
        .innerJoin(orders, eq(orders.id, orderItems.orderId))
        .where(and(eq(orderItems.productId, productId), inArray(orders.status, SOLD)))
        .groupBy(orderItems.variantId, orderItems.tierQty)
        .orderBy(desc(units))
        .limit(10),
      db
        .select({ threadColour: orderItems.threadColour, units })
        .from(orderItems)
        .innerJoin(orders, eq(orders.id, orderItems.orderId))
        .where(and(isNotNull(orderItems.threadColour), ne(orderItems.threadColour, ''), inArray(orders.status, SOLD)))
        .groupBy(orderItems.threadColour)
        .orderBy(desc(units))
        .limit(1),
    ])
    return { packs: packs.map(({ variantId, tierQty }) => ({ variantId, tierQty })), threadColour: colours[0]?.threadColour ?? null }
  } catch (err) {
    console.error('[product] failed to work out popular choices:', err)
    return { packs: [], threadColour: null }
  }
}
