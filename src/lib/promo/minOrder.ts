/**
 * The minimum-order rule for promo codes (promo_codes.min_order). Any code can
 * carry one; the landing page's welcome codes do (₦100,000 by default).
 *
 * The minimum is compared with the items subtotal: before the discount and
 * before delivery. Pure (no server imports), so the checkout check, the
 * server-side pricing and the emails all say and decide the same thing.
 */

/** ₦100,000 style. Kept here so this file has no server imports. */
export function formatNgn(n: number): string {
  return '₦' + Math.round(n).toLocaleString('en-NG')
}

/** The code's minimum in ₦, 0 when it has none (null or 0 in the database). */
export function minOrderOf(promo: { minOrder: number | null }): number {
  return promo.minOrder && promo.minOrder > 0 ? promo.minOrder : 0
}

/** Whether an items subtotal (₦, before discount and delivery) is enough for this code. */
export function meetsMinOrder(promo: { minOrder: number | null }, itemsSubtotal: number): boolean {
  return itemsSubtotal >= minOrderOf(promo)
}

/** What checkout shows when the bag is below the code's minimum. */
export function minOrderMessage(minOrder: number): string {
  return `This code works on orders of ${formatNgn(minOrder)} or more (before delivery).`
}
