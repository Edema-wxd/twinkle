import { getShippingInfo, quoteShipping } from './shippingInfo'

/**
 * Server-side shipping cost used by checkout (/api/checkout/shipping-cost) and
 * abandoned-order capture. Prices come from shippingInfo.ts, the single source
 * of truth shared with every page that mentions shipping.
 */
export async function getShippingCostFromDb(state: string, lga?: string): Promise<number> {
  const info = await getShippingInfo()
  return quoteShipping(info, state, lga).cost
}
