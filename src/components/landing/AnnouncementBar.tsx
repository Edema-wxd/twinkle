import { freeDeliveryLine } from '@/lib/checkout/freeDelivery'
import type { ShippingInfo } from '@/lib/checkout/shippingInfo'
import { Copy } from './Copy'

/**
 * The offer, before anything else. Admin → Ad landing page can set the text;
 * left empty it's built from Admin → Shipping, so it always matches checkout.
 */
export function announcementText(custom: string, shipping: Pick<ShippingInfo, 'freeLagosOver' | 'otherDays'>): string {
  if (custom.trim()) return custom.trim()
  const nationwide = `Nationwide in ${shipping.otherDays}`
  return shipping.freeLagosOver > 0
    ? `${freeDeliveryLine(shipping.freeLagosOver)} · ${nationwide}`
    : `Same-day delivery in most of Lagos · ${nationwide}`
}

/** Full-width forest strip, 36 px (two short lines on the narrowest phones), not dismissible */
export function AnnouncementBar({ text }: { text: string }) {
  return (
    <div className="border-b border-cream/10 bg-forest text-cream">
      <p className="mx-auto flex min-h-9 max-w-[1120px] items-center justify-center px-4 py-0.5 text-center font-heading text-[13px] font-medium leading-[1.2] text-balance">
        <span>
          <Copy text={text} />
        </span>
      </p>
    </div>
  )
}
