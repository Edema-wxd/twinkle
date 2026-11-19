import { freeDeliveryLine } from '@/lib/checkout/freeDelivery'

/**
 * The landing page's automatic announcement line, built from Admin → Shipping so it
 * always matches what checkout charges. The page shows it, and Admin → Ad landing
 * page previews it, from this one function. Client-safe (no DB).
 */
export function autoAnnouncement(freeLagosOver: number, otherDays: string): string {
  const days = otherDays.trim() || '3 to 5 business days'
  const lagos = freeLagosOver > 0 ? freeDeliveryLine(freeLagosOver) : 'Same-day delivery in most of Lagos'
  return `${lagos} · Nationwide in ${days}`
}

/** The text the bar shows: Admin's own text when set, otherwise the automatic line */
export function announcementText(custom: string, shipping: { freeLagosOver: number; otherDays: string }): string {
  return custom.trim() || autoAnnouncement(shipping.freeLagosOver, shipping.otherDays)
}
