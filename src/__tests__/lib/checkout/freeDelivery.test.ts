import { describe, it, expect } from 'vitest'
import { amountToFreeDelivery, freeDeliveryApplies, freeDeliveryLine } from '@/lib/checkout/freeDelivery'

describe('free Lagos delivery', () => {
  it('applies in Lagos at or over the threshold, never elsewhere, and can be switched off', () => {
    expect(freeDeliveryApplies('Lagos', 100_000, 100_000)).toBe(true)
    expect(freeDeliveryApplies('Lagos', 99_999, 100_000)).toBe(false)
    expect(freeDeliveryApplies('Abuja', 500_000, 100_000)).toBe(false)
    expect(freeDeliveryApplies('Lagos', 500_000, 0)).toBe(false)
  })

  it('says how far away it is', () => {
    expect(amountToFreeDelivery('Lagos', 60_000, 100_000)).toBe(40_000)
    expect(amountToFreeDelivery(null, 120_000, 100_000)).toBe(0)
    expect(amountToFreeDelivery('Kano', 10_000, 100_000)).toBeNull()
    expect(amountToFreeDelivery('Lagos', 10_000, 0)).toBeNull()
    expect(freeDeliveryLine(100_000)).toBe('Free Lagos delivery on orders over ₦100,000')
  })
})
