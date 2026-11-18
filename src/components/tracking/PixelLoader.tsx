'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useConsentStatus } from '@/lib/tracking/consent'
import { trackPageView } from '@/lib/tracking/pixels'

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
  cancelIdleCallback?: (id: number) => void
}

/**
 * Loads the ad pixels once the visitor accepts (straight away for returning
 * visitors who already did, or the moment they press Accept), then sends a
 * PageView on load and on every client-side route change.
 *
 * Runs after paint, when the browser is idle, so it never delays the page.
 */
export function PixelLoader() {
  const status = useConsentStatus()
  const pathname = usePathname()

  useEffect(() => {
    if (status !== 'granted' || !pathname) return
    const w = window as IdleWindow
    const run = () => trackPageView(pathname)
    if (w.requestIdleCallback && w.cancelIdleCallback) {
      const id = w.requestIdleCallback(run, { timeout: 2000 })
      return () => w.cancelIdleCallback!(id)
    }
    const t = setTimeout(run, 1)
    return () => clearTimeout(t)
  }, [status, pathname])

  return null
}
