import { describe, it, expect, vi, beforeEach } from 'vitest'

// Real Postgres (PGlite) with the real schema
vi.mock('@/db', () => import('../../helpers/pgliteDb'))

import { db, resetDb, products, productStock, orders, orderItems, faqs } from '../../helpers/pgliteDb'
import { countShopStyles, getLandingFaqs, getLandingProducts } from '@/lib/landing/data'
import { DEFAULT_LANDING_FAQS, LANDING_FAQ_CATEGORY, parseLandingConfig, type FeaturedProductConfig } from '@/lib/landing/config'
import type { ProductVariant } from '@/lib/types/product'

const beads = (): ProductVariant[] => [
  { id: 'v2', name: '2mm', price: 21215, in_stock: true, price_tiers: [{ qty: 50, price: 21215 }, { qty: 100, price: 25779 }] },
  {
    id: 'v4',
    name: '4mm',
    price: 13590,
    in_stock: true,
    price_tiers: [
      { qty: 50, price: 13590 },
      { qty: 100, price: 18903 },
      { qty: 200, price: 24451 },
    ],
  },
  { id: 'v6', name: '6mm', price: 15885, in_stock: false, price_tiers: [{ qty: 25, price: 15885 }, { qty: 50, price: 22804 }] },
]

let created = 0
async function addProduct(p: { slug: string; name?: string; material?: string; isActive?: boolean; isFeatured?: boolean; variants?: ProductVariant[] }) {
  const [row] = await db
    .insert(products)
    .values({
      slug: p.slug,
      name: p.name ?? p.slug,
      material: p.material ?? 'Gold',
      isActive: p.isActive ?? true,
      isFeatured: p.isFeatured ?? false,
      variants: p.variants ?? beads(),
      priceMin: 13590,
      priceMax: 25779,
      images: [`/img/${p.slug}-1.jpg`, `/img/${p.slug}-2.jpg`],
      image: `/img/${p.slug}-1.jpg`,
      // Newest last, so "newest first" is predictable
      createdAt: new Date(Date.UTC(2026, 0, 1, 0, ++created)),
    })
    .returning({ id: products.id })
  return row.id
}

let refs = 0
async function sale(status: string, productId: string, lines: { variantId: string; tierQty: number; threadColour: string | null; quantity: number }[]) {
  const [o] = await db
    .insert(orders)
    .values({ paystackReference: `tw-${++refs}`, paystackPayload: {}, status, customerName: 'A', customerEmail: 'a@x.com', customerPhone: '0', deliveryAddress: 'x', deliveryState: 'Lagos', shippingCost: 0, subtotal: 1, total: 1 })
    .returning({ id: orders.id })
  await db.insert(orderItems).values(lines.map((l) => ({ orderId: o.id, productId, productName: 'x', variantName: l.variantId, unitPrice: 1, lineTotal: 1, ...l })))
}

const featured = (slug: string, fallback: Partial<FeaturedProductConfig['fallback']> = {}, tagline = ''): FeaturedProductConfig => ({
  slug,
  tagline,
  fallback: { size: null, pack: null, thread: null, ...fallback },
})
const config = (list: FeaturedProductConfig[]) => parseLandingConfig({ featured: list })

beforeEach(async () => {
  await resetDb()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('getLandingProducts: which products', () => {
  it('takes the configured slugs in config order, skipping missing and inactive ones, and drops emoji from names', async () => {
    await addProduct({ slug: 'gold-twinkles', name: 'Gold Twinkles ✨' })
    await addProduct({ slug: 'silver-twinkles', name: 'Silver Twinkles' })
    await addProduct({ slug: 'crystal-twinkles', isActive: false })

    const list = await getLandingProducts(
      config([featured('silver-twinkles', {}, 'Cool silver'), featured('no-such-slug'), featured('gold-twinkles', {}, 'Warm gold')]),
    )
    expect(list.map((p) => p.slug)).toEqual(['silver-twinkles', 'gold-twinkles'])
    expect(list.map((p) => p.tagline)).toEqual(['Cool silver', 'Warm gold'])
    expect(list[1].name).toBe('Gold Twinkles')
    expect(list[1].cartName).toBe('Gold Twinkles ✨') // the cart keeps the stored name, like the product page
    expect(list[1].images).toEqual(['/img/gold-twinkles-1.jpg', '/img/gold-twinkles-2.jpg'])

    const withInactive = await getLandingProducts(config([featured('crystal-twinkles'), featured('gold-twinkles')]))
    expect(withInactive.map((p) => p.slug)).toEqual(['gold-twinkles'])
  })

  it('falls back to products ticked featured when no configured slug resolves (never Tools)', async () => {
    await addProduct({ slug: 'plain' })
    await addProduct({ slug: 'featured-a', isFeatured: true })
    await addProduct({ slug: 'shears', material: 'Tools', isFeatured: true })
    await addProduct({ slug: 'featured-b', isFeatured: true })

    const list = await getLandingProducts(config([featured('gone')]))
    expect(list.map((p) => p.slug)).toEqual(['featured-b', 'featured-a'])
    expect(list.every((p) => p.tagline === '')).toBe(true)
  })

  it('then to the three newest active bead products', async () => {
    for (const slug of ['one', 'two', 'three', 'four']) await addProduct({ slug })
    await addProduct({ slug: 'off', isActive: false })
    await addProduct({ slug: 'shears', material: 'Tools' })

    const list = await getLandingProducts(config([]))
    expect(list.map((p) => p.slug)).toEqual(['four', 'three', 'two'])
  })

  it('returns nothing (the page still renders) when the database fails', async () => {
    vi.spyOn(db, 'select').mockImplementationOnce(() => {
      throw new Error('connection refused')
    })
    expect(await getLandingProducts(config([featured('gold-twinkles')]))).toEqual([])
  })
})

describe('getLandingProducts: preselected options', () => {
  it('starts on the best-seller from paid orders, skipping packs that are out of stock or no longer fit', async () => {
    const id = await addProduct({ slug: 'gold-twinkles' })
    // Only 60 beads of 2mm left: the best-selling 2mm/100 can't be supplied
    await db.insert(productStock).values({ productId: id, variantId: 'v2', units: 60 })
    await sale('paid', id, [{ variantId: 'v2', tierQty: 100, threadColour: 'blonde', quantity: 5 }])
    await sale('delivered', id, [{ variantId: 'v6', tierQty: 50, threadColour: 'blonde', quantity: 4 }]) // 6mm is out of stock
    await sale('paid', id, [{ variantId: 'v4', tierQty: 200, threadColour: 'red', quantity: 2 }])
    await sale('payment_review', id, [{ variantId: 'v4', tierQty: 50, threadColour: 'black', quantity: 9 }]) // not a real sale

    const [p] = await getLandingProducts(config([featured('gold-twinkles', { size: '2mm', pack: 50, thread: 'red' })]))
    expect(p.selection).toEqual({ variantId: 'v4', tierQty: 200, thread: 'blonde' })
    expect(p.defaultPrice).toBe(24451)
    // Live stock overlaid
    expect(p.variants.find((v) => v.id === 'v2')?.stock).toBe(60)
  })

  it('uses the config fallback before the first sale (size by name, pack by beads, thread by colour id)', async () => {
    await addProduct({ slug: 'gold-twinkles' })
    const [p] = await getLandingProducts(config([featured('gold-twinkles', { size: '4 MM', pack: 100, thread: 'blonde' })]))
    expect(p.selection).toEqual({ variantId: 'v4', tierQty: 100, thread: 'blonde' })
    expect(p.defaultPrice).toBe(18903)
  })

  it('ignores fallback options the product can’t supply', async () => {
    await addProduct({ slug: 'gold-twinkles' })
    // 6mm is out of stock, the 2mm used instead has no pack of 150, "purple" isn't a thread colour
    const [p] = await getLandingProducts(config([featured('gold-twinkles', { size: '6mm', pack: 150, thread: 'purple' })]))
    expect(p.selection).toEqual({ variantId: 'v2', tierQty: 50, thread: 'black' })
  })

  it('otherwise starts on the first in-stock size, its first pack that fits, and black thread', async () => {
    const variants = beads()
    variants[0].in_stock = false
    const id = await addProduct({ slug: 'silver-twinkles', variants })
    await db.insert(productStock).values({ productId: id, variantId: 'v4', units: 120 }) // 50 and 100 fit, 200 doesn't
    const [p] = await getLandingProducts(config([featured('silver-twinkles')]))
    expect(p.selection).toEqual({ variantId: 'v4', tierQty: 50, thread: 'black' })
    expect(p.defaultPrice).toBe(13590)
  })

  it('Tools have no thread colour', async () => {
    await addProduct({ slug: 'shears', material: 'Tools', variants: [{ id: 's', name: 'Standard', price: 3500, in_stock: true, price_tiers: [{ qty: 1, price: 3500 }] }] })
    const [p] = await getLandingProducts(config([featured('shears')]))
    expect(p.selection).toEqual({ variantId: 's', tierQty: 1, thread: '' })
  })
})

describe('countShopStyles', () => {
  it('counts active bead products only', async () => {
    await addProduct({ slug: 'a' })
    await addProduct({ slug: 'b' })
    await addProduct({ slug: 'c', isActive: false })
    await addProduct({ slug: 'shears', material: 'Tools' })
    expect(await countShopStyles()).toBe(2)
  })
})

describe('getLandingFaqs', () => {
  it('uses the "Landing page" FAQs in display order, as safe HTML and plain text', async () => {
    await db.insert(faqs).values([
      { category: LANDING_FAQ_CATEGORY, question: 'Second?', answer: '<p>Two <strong>bold</strong></p><script>x</script>', displayOrder: 2 },
      { category: LANDING_FAQ_CATEGORY, question: 'First?', answer: 'Plain one', displayOrder: 1 },
      { category: 'Shipping', question: 'Elsewhere?', answer: 'Not here', displayOrder: 0 },
    ])
    const list = await getLandingFaqs()
    expect(list.map((f) => f.question)).toEqual(['First?', 'Second?'])
    expect(list[1].answerHtml).toContain('<strong>bold</strong>')
    expect(list[1].answerHtml).not.toContain('script')
    expect(list[1].answerText).toBe('Two bold')
  })

  it('falls back to the draft FAQs until some are added', async () => {
    const list = await getLandingFaqs()
    expect(list.map((f) => f.question)).toEqual(DEFAULT_LANDING_FAQS.map((f) => f.question))
  })
})
