import { and, eq, gte, inArray, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db, orders, orderItems, abandonedOrders, products, promoCodes } from '@/db'
import { getShippingInfo, quoteShipping, formatNaira } from '@/lib/checkout/shippingInfo'
import type { ProductVariant } from '@/lib/types/product'
import type { OrderEmailItem } from '@/lib/notifications/customerEmail'
import { aggregateNeeds, getStockMap, takeStock, withStock } from '@/lib/stock'

/**
 * Server-side source of truth for what a paid order costs.
 *
 * The browser sends cart items, subtotal, shipping and discount in the
 * Paystack metadata, and it also chooses the amount Paystack charges. None of
 * that can be trusted. So when Paystack reports a successful charge (webhook or
 * the verify call), we:
 *   1. re-price every line from the products table (variant + pack tier),
 *   2. re-quote shipping from shippingInfo.ts,
 *   3. re-validate the promo code and recompute the discount,
 *   4. compare that total with the amount Paystack actually charged.
 * The order is always recorded with the server's numbers. If the charge was
 * short (or a line can't be priced), it's saved as `payment_review` with a
 * human-readable `paymentIssue` instead of `paid`, so nothing ships, and the
 * customer gets no automatic "confirmed" email, until someone checks it.
 */

export const PAYMENT_REVIEW_STATUS = 'payment_review'
const MAX_QTY = 10
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ── Metadata (untrusted, from the browser via Paystack) ─────────────────────

export type ClaimedItem = {
  productId: string
  productName: string
  variantId: string
  variantName: string
  tierQty: number
  threadColour: string
  unitPrice: number
  quantity: number
  isTool: boolean
}

export type CheckoutMetadata = {
  cart_items: ClaimedItem[]
  customer_details: {
    first_name: string
    last_name: string
    phone: string
    delivery_address: string
    state: string
    lga?: string
  }
  subtotal?: number
  shipping_cost?: number
  promo_code?: string | null
}

export function parseCheckoutMetadata(raw: unknown): CheckoutMetadata | null {
  const m = raw as Partial<CheckoutMetadata> | null | undefined
  if (!m || typeof m !== 'object') return null
  const c = m.customer_details
  if (!c || typeof c.state !== 'string' || typeof c.delivery_address !== 'string') return null
  if (!Array.isArray(m.cart_items) || m.cart_items.length === 0 || m.cart_items.length > 50) return null
  const items = m.cart_items.filter(
    (i): i is ClaimedItem =>
      !!i && typeof i.productId === 'string' && typeof i.variantId === 'string' && Number.isFinite(i.quantity),
  )
  if (items.length !== m.cart_items.length) return null
  return { ...m, cart_items: items } as CheckoutMetadata
}

// ── Pricing ──────────────────────────────────────────────────────────────────

/**
 * ok = can be sold now; sold_out = none left (or marked sold out);
 * low_stock = some left but not enough for this quantity (see `available`);
 * unavailable = product/variant/pack gone or archived
 */
export type LineStatus = 'ok' | 'sold_out' | 'low_stock' | 'unavailable'

export type PricedLine = ClaimedItem & {
  serverUnitPrice: number | null
  lineTotal: number
  status: LineStatus
  /** Tracked units left for this line's variant (beads, or items for Tools); null when not tracked */
  available: number | null
}

export type PricedOrder = {
  lines: PricedLine[]
  /** Slugs of the products in the order (for cache revalidation) */
  slugs: string[]
  subtotal: number
  discount: number
  promoCode: string | null
  shipping: number
  total: number
  problems: string[]
}

export async function priceOrder(meta: CheckoutMetadata): Promise<PricedOrder> {
  const problems: string[] = []

  const ids = [...new Set(meta.cart_items.map((i) => i.productId).filter((id) => UUID_RE.test(id)))]
  const rows = ids.length
    ? await db
        .select({ id: products.id, name: products.name, slug: products.slug, variants: products.variants, isActive: products.isActive, material: products.material })
        .from(products)
        .where(inArray(products.id, ids))
    : []
  // Live stock counts overlay the variants (sold out once fewer units than the smallest pack remain)
  const stockMap = await getStockMap(ids)
  const byId = new Map(rows.map((r) => [r.id, { ...r, variants: withStock(r.id, r.variants as ProductVariant[], stockMap) }]))

  const lines: PricedLine[] = meta.cart_items.map((item) => {
    const qty = Math.trunc(item.quantity)
    const product = byId.get(item.productId)
    const variant = (product?.variants as ProductVariant[] | undefined)?.find((v) => v.id === item.variantId)
    let price: number | null = null
    let status: LineStatus = 'ok'
    if (!product) {
      status = 'unavailable'
      problems.push(`"${item.productName}" no longer exists, so its price couldn't be checked.`)
    } else if (!variant) {
      status = 'unavailable'
      problems.push(`"${product.name}" has no "${item.variantName}" option any more.`)
    } else {
      const tiers = Array.isArray(variant.price_tiers) ? variant.price_tiers : []
      // The pack size decides what gets shipped, so it must match a real tier exactly.
      // Only a variant with no tiers at all (sold singly) falls back to its flat price.
      const tier = tiers.find((t) => t.qty === item.tierQty)
      if (tier) price = tier.price
      else if (tiers.length === 0 && typeof variant.price === 'number') price = variant.price
      else {
        status = 'unavailable'
        problems.push(`"${product.name} ${variant.name}" has no pack of ${item.tierQty}.`)
      }
      // Stock: the catalogue only records in/out of stock per variant (no counts)
      if (status === 'ok' && !product.isActive) {
        status = 'unavailable'
        problems.push(`"${product.name}" has been taken off the shop.`)
      } else if (status === 'ok' && !variant.in_stock) {
        status = 'sold_out'
        problems.push(
          typeof variant.stock === 'number'
            ? `"${product.name} ${variant.name}" is sold out (stock: ${variant.stock}).`
            : `"${product.name} ${variant.name}" is marked sold out.`,
        )
      }
    }
    if (!(qty >= 1 && qty <= MAX_QTY)) problems.push(`"${item.productName}" has an invalid quantity (${item.quantity}).`)
    const unit = price ?? 0
    return {
      ...item,
      quantity: qty,
      serverUnitPrice: price,
      lineTotal: unit * Math.max(0, qty),
      status,
      available: typeof variant?.stock === 'number' ? variant.stock : null,
    }
  })

  // Enough stock for the whole bag? Lines of the same size (e.g. two thread colours) share one count.
  const needs = aggregateNeeds(
    lines.filter((l) => l.status === 'ok').map((l) => ({ ...l, label: `${l.productName} ${l.variantName}`.trim() })),
  )
  for (const need of needs) {
    const sample = lines.find((l) => l.productId === need.productId && l.variantId === need.variantId)
    if (sample?.available == null || need.units <= sample.available) continue
    const unitWord = byId.get(need.productId)?.material === 'Tools' ? 'left' : 'beads left'
    problems.push(`Only ${sample.available} ${unitWord} of "${need.label}", but the order needs ${need.units}.`)
    for (const l of lines) if (l.productId === need.productId && l.variantId === need.variantId) l.status = 'low_stock'
  }

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0)

  const info = await getShippingInfo()
  let shipping = quoteShipping(info, meta.customer_details.state, meta.customer_details.lga).cost

  let discount = 0
  let promoCode: string | null = null
  const code = typeof meta.promo_code === 'string' ? meta.promo_code.toUpperCase().trim() : ''
  if (code) {
    const [promo] = await db.select().from(promoCodes).where(eq(promoCodes.code, code)).limit(1)
    const usable =
      promo &&
      promo.isActive &&
      !(promo.expiresAt && promo.expiresAt < new Date()) &&
      !(promo.maxUses !== null && promo.currentUses >= promo.maxUses)
    if (!usable) {
      problems.push(`Promo code ${code} was used but isn't valid any more (inactive, expired or used up).`)
    } else {
      promoCode = promo.code
      if (promo.discountType === 'free_shipping') shipping = 0
      else if (promo.discountType === 'percentage') discount = Math.floor((subtotal * promo.discountValue) / 100)
      else if (promo.discountType === 'fixed') discount = Math.min(promo.discountValue, subtotal)
    }
  }

  return { lines, slugs: rows.map((r) => r.slug), subtotal, discount, promoCode, shipping, total: subtotal - discount + shipping, problems }
}

// ── Recording ────────────────────────────────────────────────────────────────

export type ChargeInput = {
  reference: string
  amountKobo: number
  currency: string | undefined
  customerEmail: string
  ipAddress: string | null | undefined
  payload: unknown
  metadata: unknown
}

export type RecordedOrder = {
  orderId: string
  created: boolean
  status: string
  paymentIssue: string | null
  customerName: string
  customerEmail: string
  customerPhone: string
  deliveryState: string
  totalNaira: number
  amountPaidNaira: number | null
  emailItems: OrderEmailItem[]
}

/**
 * Idempotently record a successful Paystack charge. Safe to call from both the
 * webhook and the verify route, in any order, any number of times: the first
 * call creates the order, later calls return it unchanged (never rewinding a
 * status like 'shipped' back to 'paid').
 * Returns null when the metadata is unusable (nothing to build an order from).
 */
export async function recordPaidOrder(charge: ChargeInput): Promise<RecordedOrder | null> {
  const existing = await loadOrder(charge.reference)
  if (existing) return existing

  const meta = parseCheckoutMetadata(charge.metadata)
  if (!meta) {
    console.error('[payments] Unusable checkout metadata for', charge.reference)
    return null
  }

  const priced = await priceOrder(meta)
  const amountPaid = Math.floor(charge.amountKobo) / 100
  const issues = [...priced.problems]

  if ((charge.currency ?? 'NGN').toUpperCase() !== 'NGN') {
    issues.push(`Charged in ${charge.currency}, not NGN.`)
  }
  if (Math.round(charge.amountKobo) < priced.total * 100) {
    issues.push(
      `Paystack charged ${formatNaira(amountPaid)} but the order comes to ${formatNaira(priced.total)} at current prices ` +
        `(short by ${formatNaira(priced.total - amountPaid)}).`,
    )
  }

  const paymentIssue = issues.length ? issues.join(' ') : null
  const status = paymentIssue ? PAYMENT_REVIEW_STATUS : 'paid'
  const c = meta.customer_details

  // onConflictDoNothing: the webhook and the verify call can race; only one insert wins
  const [inserted] = await db
    .insert(orders)
    .values({
      paystackReference: charge.reference,
      paystackPayload: charge.payload,
      status,
      customerName: `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || 'Customer',
      customerEmail: charge.customerEmail.toLowerCase(),
      customerPhone: c.phone ?? '',
      customerIp: charge.ipAddress ?? null,
      deliveryAddress: c.delivery_address,
      deliveryState: c.state,
      shippingCost: priced.shipping,
      subtotal: priced.subtotal,
      total: priced.total,
      promoCode: priced.promoCode,
      discountAmount: priced.discount,
      amountPaid: Math.round(amountPaid),
      paymentIssue,
    })
    .onConflictDoNothing({ target: orders.paystackReference })
    .returning({ id: orders.id })

  if (!inserted) return loadOrder(charge.reference) // lost the race

  // Take the stock (only the winning insert does this, so retries never double-count).
  // Each decrement is atomic, so simultaneous orders can't both take the last beads.
  let finalIssue = paymentIssue
  try {
    const shortfalls = await takeStock(
      aggregateNeeds(
        priced.lines
          .filter((l) => l.status === 'ok')
          .map((l) => ({ ...l, label: `${l.productName} ${l.variantName}`.trim() })),
      ),
    )
    if (shortfalls.length > 0) {
      const text = shortfalls
        .map((s) => `Not enough stock for "${s.need.label}": needed ${s.need.units}, only ${s.available} left (sold to another order at the same time).`)
        .join(' ')
      finalIssue = [paymentIssue, text].filter(Boolean).join(' ')
      await db.update(orders).set({ status: PAYMENT_REVIEW_STATUS, paymentIssue: finalIssue }).where(eq(orders.id, inserted.id))
      console.warn('[payments] Stock shortfall, order held for review', charge.reference, text)
    }
  } catch (e) {
    console.error('[payments] Failed to take stock:', e)
  }
  // Cached shop pages show stock, so refresh the ones this order touched
  try {
    revalidatePath('/catalog')
    revalidatePath('/')
    for (const slug of new Set(priced.slugs)) revalidatePath(`/catalog/${slug}`)
  } catch {
    /* outside a request context (tests/scripts) */
  }

  await db.insert(orderItems).values(
    priced.lines.map((l) => ({
      orderId: inserted.id,
      productId: UUID_RE.test(l.productId) ? l.productId : '00000000-0000-0000-0000-000000000000',
      productName: l.productName,
      variantId: l.variantId,
      variantName: l.variantName,
      tierQty: l.tierQty,
      threadColour: l.isTool ? null : l.threadColour,
      unitPrice: l.serverUnitPrice ?? l.unitPrice,
      quantity: l.quantity,
      lineTotal: (l.serverUnitPrice ?? l.unitPrice) * l.quantity,
    })),
  )

  if (priced.promoCode) {
    try {
      await db
        .update(promoCodes)
        .set({ currentUses: sql`${promoCodes.currentUses} + 1` })
        .where(eq(promoCodes.code, priced.promoCode))
    } catch (e) {
      console.error('[payments] Failed to increment promo usage:', e)
    }
  }

  try {
    await db
      .update(abandonedOrders)
      .set({ recovered: true, recoveredAt: new Date() })
      .where(
        and(
          eq(abandonedOrders.customerEmail, charge.customerEmail.toLowerCase()),
          eq(abandonedOrders.recovered, false),
          gte(abandonedOrders.createdAt, new Date(Date.now() - 48 * 60 * 60 * 1000)),
        ),
      )
  } catch (e) {
    console.error('[payments] Failed to mark abandoned orders recovered:', e)
  }

  if (paymentIssue) console.warn('[payments] Order flagged for review', charge.reference, paymentIssue)

  const recorded = await loadOrder(charge.reference)
  return recorded ? { ...recorded, created: true } : null
}

async function loadOrder(reference: string): Promise<RecordedOrder | null> {
  const row = await db.query.orders.findFirst({
    where: eq(orders.paystackReference, reference),
    with: { orderItems: true },
  })
  if (!row) return null
  return {
    orderId: row.id,
    created: false,
    status: row.status,
    paymentIssue: row.paymentIssue ?? null,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerPhone: row.customerPhone,
    deliveryState: row.deliveryState,
    totalNaira: row.total,
    amountPaidNaira: row.amountPaid ?? null,
    emailItems: row.orderItems.map((i) => ({
      productName: i.productName,
      variantName: i.variantName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
      tierQty: i.tierQty,
      threadColour: i.threadColour,
    })),
  }
}
