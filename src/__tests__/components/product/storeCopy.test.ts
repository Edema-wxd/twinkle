import { describe, it, expect } from 'vitest'
import { deliveryLine, fromPrice, lowestFromPrice, priceRangeText } from '@/components/product/storeCopy'

const tiers = (...prices: number[]) => prices.map((price, i) => ({ qty: (i + 1) * 50, price }))

describe('fromPrice', () => {
  it('is the cheapest pack of a size that is in stock', () => {
    expect(
      fromPrice({
        price_min: 12000,
        variants: [
          { in_stock: false, price: 12000, price_tiers: tiers(12000, 20000) },
          { in_stock: true, price: 18903, price_tiers: tiers(18903, 22774) },
          { in_stock: true, price: 15885, price_tiers: tiers(15885, 22805) },
        ],
      }),
    ).toBe(15885)
  })

  it('uses the variant price when a size has no packs, and price_min when nothing is in stock', () => {
    expect(fromPrice({ price_min: 1, variants: [{ in_stock: true, price: 3500, price_tiers: [] }] })).toBe(3500)
    expect(fromPrice({ price_min: 9000, variants: [{ in_stock: false, price: 9000, price_tiers: tiers(9000) }] })).toBe(9000)
    expect(fromPrice({ price_min: 0, variants: [] })).toBeNull()
  })
})

describe('lowestFromPrice and priceRangeText', () => {
  const products = [
    { price_min: 15885, price_max: 46852, variants: [{ in_stock: true, price: 15885, price_tiers: tiers(15885, 46852) }] },
    { price_min: 3500, price_max: 3500, variants: [{ in_stock: true, price: 3500, price_tiers: tiers(3500) }] },
  ]

  it('finds the lowest price across products', () => {
    expect(lowestFromPrice(products)).toBe(3500)
    expect(lowestFromPrice([])).toBeNull()
  })

  it('formats the range in ₦ for people', () => {
    expect(priceRangeText(products)).toBe('₦3,500 - ₦46,852')
    expect(priceRangeText([products[1]])).toBe('₦3,500')
    expect(priceRangeText([])).toBeNull()
  })
})

describe('deliveryLine', () => {
  it('reads like the spec', () => {
    expect(deliveryLine(3000, '3-5 business days')).toBe('Lagos from ₦3,000, same day in most areas · Nationwide 3-5 business days')
  })
})
