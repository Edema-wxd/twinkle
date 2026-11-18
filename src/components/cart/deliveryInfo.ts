'use client'

import { useEffect, useState } from 'react'

/** What the cart shows about delivery, from Admin → Shipping via /api/checkout/free-delivery. 0 = unknown / no offer. */
export type CartDeliveryInfo = {
  /** Free Lagos delivery threshold (0 = no offer) */
  freeLagosOver: number
  /** Cheapest Lagos delivery zone fee */
  lagosFrom: number
}

const NONE: CartDeliveryInfo = { freeLagosOver: 0, lagosFrom: 0 }

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0)

// Fetched once per page load and shared by the cart drawer, the cart page and the free delivery nudge
let infoPromise: Promise<CartDeliveryInfo> | null = null

export function loadCartDeliveryInfo(): Promise<CartDeliveryInfo> {
  infoPromise ??= fetch('/api/checkout/free-delivery')
    .then((r) => (r.ok ? r.json() : NONE))
    .then((d: Partial<Record<keyof CartDeliveryInfo, unknown>>) => ({ freeLagosOver: num(d.freeLagosOver), lagosFrom: num(d.lagosFrom) }))
    .catch(() => {
      // Try again next time something asks (a network blip shouldn't stick for the whole visit)
      infoPromise = null
      return NONE
    })
  return infoPromise
}

/** Forget the cached answer (tests). */
export function resetCartDeliveryInfo() {
  infoPromise = null
}

/** Delivery figures for the cart, NONE until loaded. */
export function useCartDeliveryInfo(): CartDeliveryInfo {
  const [info, setInfo] = useState<CartDeliveryInfo>(NONE)
  useEffect(() => {
    let live = true
    loadCartDeliveryInfo().then((i) => live && setInfo(i))
    return () => {
      live = false
    }
  }, [])
  return info
}
