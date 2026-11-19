import { revalidatePath } from 'next/cache'
import { LANDING_PATH } from '@/lib/landing/config'

/**
 * Refresh the ad landing page and every hero version under it (/shop-twinkles/<key>).
 * Call after saving anything the page shows: its settings, landing FAQs, reviews,
 * products or delivery prices.
 */
export function revalidateLandingPage() {
  revalidatePath(LANDING_PATH, 'layout')
}
