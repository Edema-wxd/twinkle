/**
 * Free Lagos delivery over a spend threshold (Admin → Shipping; 0 switches it off).
 * Pure, so checkout in the browser and the server that records the order apply
 * exactly the same rule. "Spend" is the items after any promo discount, before delivery.
 */

export const DEFAULT_FREE_LAGOS_OVER = 100_000

export function freeDeliveryApplies(state: string, itemsAfterDiscount: number, freeLagosOver: number): boolean {
  return state === 'Lagos' && freeLagosOver > 0 && itemsAfterDiscount >= freeLagosOver
}

/** How much more to spend for free delivery (0 once reached, null when there's no offer for this state). */
export function amountToFreeDelivery(state: string | null, itemsAfterDiscount: number, freeLagosOver: number): number | null {
  if (freeLagosOver <= 0 || (state !== null && state !== 'Lagos')) return null
  return Math.max(0, freeLagosOver - itemsAfterDiscount)
}

export const naira = (n: number) => '₦' + n.toLocaleString('en-NG')

export const freeDeliveryLine = (freeLagosOver: number) => `Free Lagos delivery on orders over ${naira(freeLagosOver)}`
