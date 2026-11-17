import { describe, it, expect } from 'vitest'
import { deliveryAreaFromPayload, deliveryPlace } from '@/lib/orders/deliveryPlace'

describe('delivery place', () => {
  it('reads the area chosen at checkout from the Paystack payload', () => {
    expect(deliveryAreaFromPayload({ metadata: { customer_details: { lga: ' Lekki Phase 1 ' } } })).toBe('Lekki Phase 1')
    expect(deliveryAreaFromPayload({ metadata: { customer_details: {} } })).toBeNull()
    expect(deliveryAreaFromPayload(null)).toBeNull()
    expect(deliveryAreaFromPayload({ metadata: { customer_details: { lga: 42 } } })).toBeNull()
  })

  it('shows "area, state", or just the state', () => {
    expect(deliveryPlace('Lagos', 'Lekki Phase 1')).toBe('Lekki Phase 1, Lagos')
    expect(deliveryPlace('Abuja', null)).toBe('Abuja')
    expect(deliveryPlace('Lagos', 'lagos')).toBe('Lagos')
  })
})
