import { cache } from 'react'
import { and, asc, count, desc, eq, inArray, ne } from 'drizzle-orm'
import { db, faqs as faqsTable, products as productsTable } from '@/db'
import type { Product, ProductMaterial, ProductVariant } from '@/lib/types/product'
import { applyStockToProducts } from '@/lib/stock'
import { popularChoice } from '@/lib/products/popularChoice'
import { getShippingInfo } from '@/lib/checkout/shippingInfo'
import { faqAnswerHtml, htmlToText } from '@/lib/content'
import { productDescriptionText } from '@/lib/product-description'
import { getLandingConfig } from './config.server'
import { DEFAULT_LANDING_FAQS, LANDING_FAQ_CATEGORY, type LandingConfig } from './config'
import { cleanProductName, resolveDefaultSelection, selectionPrice, type Selection } from './selection'

/**
 * Everything /shop-twinkles reads from the database. Every read fails soft (logs
 * and returns empty or defaults), so the ad landing page always renders, even
 * mid-migration or during a database hiccup.
 */

/** Per request: the layout, metadata and page share one read of each */
export const loadLandingConfig = cache(getLandingConfig)
export const loadShippingInfo = cache(getShippingInfo)

export type LandingProduct = {
  id: string
  slug: string
  /** Display name, emoji removed */
  name: string
  /** Name as stored; cart lines use it, exactly as the product page does */
  cartName: string
  /** One line under the name (empty for products that came from a fallback) */
  tagline: string
  material: ProductMaterial
  /** Main image: the cart line thumbnail */
  image: string
  /** Gallery for the card's carousel */
  images: string[]
  variants: ProductVariant[]
  price_min: number
  /** Preselected options, resolved on the server so the first HTML has the real price */
  selection: Selection
  /** Price of the preselected options */
  defaultPrice: number
  /** Plain-text description, for the Product JSON-LD */
  descriptionText: string
}

type ProductRow = typeof productsTable.$inferSelect

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    image: row.image,
    material: row.material as ProductMaterial,
    is_featured: row.isFeatured,
    variants: (row.variants as unknown as ProductVariant[]) ?? [],
    price_min: row.priceMin,
    price_max: row.priceMax,
    created_at: row.createdAt.toISOString(),
    images: row.images?.length ? row.images : undefined,
  }
}

const notTools = ne(productsTable.material, 'Tools')

/**
 * The products for the Best-sellers cards: the slugs from the config (active only,
 * in config order, missing ones skipped). If none of them resolve: the products
 * ticked "featured", then the newest active beads. At most 3.
 */
async function featuredRows(config: LandingConfig): Promise<{ row: ProductRow; tagline: string; fallback: LandingConfig['featured'][number]['fallback'] | null }[]> {
  const slugs = config.featured.map((f) => f.slug)
  if (slugs.length) {
    const rows = await db.select().from(productsTable).where(and(inArray(productsTable.slug, slugs), eq(productsTable.isActive, true)))
    const picked = config.featured
      .map((f) => {
        const row = rows.find((r) => r.slug === f.slug)
        return row ? { row, tagline: f.tagline, fallback: f.fallback } : null
      })
      .filter((p) => p !== null)
      .slice(0, 3)
    if (picked.length) return picked
  }

  const featured = await db
    .select()
    .from(productsTable)
    .where(and(eq(productsTable.isActive, true), eq(productsTable.isFeatured, true), notTools))
    .orderBy(desc(productsTable.createdAt))
    .limit(3)
  if (featured.length) return featured.map((row) => ({ row, tagline: '', fallback: null }))

  const newest = await db.select().from(productsTable).where(and(eq(productsTable.isActive, true), notTools)).orderBy(desc(productsTable.createdAt)).limit(3)
  return newest.map((row) => ({ row, tagline: '', fallback: null }))
}

export async function getLandingProducts(config: LandingConfig): Promise<LandingProduct[]> {
  try {
    const picked = await featuredRows(config)
    // Live stock: sizes and pack sizes sell out automatically
    const withStock = await applyStockToProducts(picked.map((p) => toProduct(p.row)))
    const popular = await Promise.all(withStock.map((p) => popularChoice(p.id)))

    return withStock.map((product, i) => {
      const selection = resolveDefaultSelection(product, popular[i], picked[i].fallback)
      return {
        id: product.id,
        slug: product.slug,
        name: cleanProductName(product.name),
        cartName: product.name,
        tagline: picked[i].tagline,
        material: product.material,
        image: product.image,
        images: product.images?.length ? product.images : [product.image],
        variants: product.variants,
        price_min: product.price_min,
        selection,
        defaultPrice: selectionPrice(product, selection),
        descriptionText: productDescriptionText(product.description).slice(0, 500),
      }
    })
  } catch (err) {
    console.error('[landing] failed to load the featured products:', err)
    return []
  }
}

/** Active bead styles in the shop, for "See all N styles" (null if it can't be counted) */
export async function countShopStyles(): Promise<number | null> {
  try {
    const [row] = await db.select({ n: count() }).from(productsTable).where(and(eq(productsTable.isActive, true), notTools))
    return row?.n ?? null
  } catch (err) {
    console.error('[landing] failed to count products:', err)
    return null
  }
}

export type LandingFaqItem = {
  id: string
  question: string
  /** Sanitised HTML */
  answerHtml: string
  /** Plain text, for the FAQPage JSON-LD and the placeholder check */
  answerText: string
}

/** Admin → FAQs in the "Landing page" category, in their display order; the draft FAQs until there are some */
export async function getLandingFaqs(): Promise<LandingFaqItem[]> {
  try {
    const rows = await db
      .select({ id: faqsTable.id, question: faqsTable.question, answer: faqsTable.answer })
      .from(faqsTable)
      .where(eq(faqsTable.category, LANDING_FAQ_CATEGORY))
      .orderBy(asc(faqsTable.displayOrder), asc(faqsTable.createdAt))
    if (rows.length) {
      return rows.map((r) => {
        const answerHtml = faqAnswerHtml(r.answer)
        return { id: r.id, question: r.question, answerHtml, answerText: htmlToText(answerHtml) }
      })
    }
  } catch (err) {
    console.error('[landing] failed to load the FAQs, using the drafts:', err)
  }
  return DEFAULT_LANDING_FAQS.map((f, i) => {
    const answerHtml = faqAnswerHtml(f.answer)
    return { id: `draft-${i}`, question: f.question, answerHtml, answerText: htmlToText(answerHtml) }
  })
}
