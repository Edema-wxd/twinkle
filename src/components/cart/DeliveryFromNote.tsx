'use client'

import { naira } from '@/lib/checkout/freeDelivery'
import { useCartDeliveryInfo } from './deliveryInfo'

/** "Delivery: from ₦3,000 in Lagos, shown before you pay" under the cart subtotal (cheapest zone from Admin → Shipping). */
export function DeliveryFromNote({ className = '' }: { className?: string }) {
  const { lagosFrom } = useCartDeliveryInfo()
  return (
    <p className={className}>
      {lagosFrom > 0 ? `Delivery: from ${naira(lagosFrom)} in Lagos, shown before you pay` : 'Delivery fee shown before you pay'}
    </p>
  )
}
