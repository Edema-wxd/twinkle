'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { captureUtmFromLocation } from '@/lib/tracking/utm'

/**
 * Keeps the utm_* tags of the ad link the visitor arrived on (30-day
 * first-party cookie, last click wins), so checkout can record them on the
 * order. Checked on load and on each route change.
 */
export function UtmCapture() {
  const pathname = usePathname()
  useEffect(() => {
    try {
      captureUtmFromLocation()
    } catch {
      /* cookies blocked: nothing to keep */
    }
  }, [pathname])
  return null
}
