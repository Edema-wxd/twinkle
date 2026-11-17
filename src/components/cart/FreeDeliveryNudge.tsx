'use client'

import { useEffect, useState } from 'react'
import { amountToFreeDelivery, naira } from '@/lib/checkout/freeDelivery'

// Fetched once per page load and shared by the cart drawer and the cart page
let thresholdPromise: Promise<number> | null = null
function loadThreshold(): Promise<number> {
  thresholdPromise ??= fetch('/api/checkout/free-delivery')
    .then((r) => (r.ok ? r.json() : { freeLagosOver: 0 }))
    .then((d: { freeLagosOver?: unknown }) => (typeof d.freeLagosOver === 'number' ? d.freeLagosOver : 0))
    .catch(() => {
      thresholdPromise = null
      return 0
    })
  return thresholdPromise
}

/** "₦X away from free Lagos delivery", with a progress bar. Hidden when there's no offer. */
export function FreeDeliveryNudge({ subtotal, className = '' }: { subtotal: number; className?: string }) {
  const [threshold, setThreshold] = useState(0)
  useEffect(() => {
    let live = true
    loadThreshold().then((t) => live && setThreshold(t))
    return () => {
      live = false
    }
  }, [])

  const left = amountToFreeDelivery(null, subtotal, threshold)
  if (left === null || subtotal <= 0) return null
  const pct = Math.min(100, Math.round((subtotal / threshold) * 100))

  return (
    <div className={className}>
      <p className="font-body text-xs text-charcoal/80" aria-live="polite">
        {left === 0 ? (
          <strong className="font-semibold text-green-700">You&apos;ve got free Lagos delivery!</strong>
        ) : (
          <>
            You&apos;re <strong className="font-semibold text-forest">{naira(left)}</strong> away from free Lagos delivery
          </>
        )}
      </p>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-charcoal/10" aria-hidden="true">
        <div className={`h-full rounded-full transition-[width] duration-500 ${left === 0 ? 'bg-green-600' : 'bg-gold'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
