'use client'

import { pixelsConfigured } from '@/lib/tracking/config'
import { setConsent, useConsentStatus, useIsClient, type ConsentStatus } from '@/lib/tracking/consent'
import { loadedPixels } from '@/lib/tracking/pixels'

const BUTTON =
  'min-h-11 rounded-lg border-2 px-4 font-heading text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest'
const ON = 'border-forest bg-forest text-cream'
const OFF = 'border-forest/40 bg-white text-forest hover:border-forest'

const LABEL: Record<ConsentStatus, string> = {
  granted: 'You have allowed ad cookies.',
  denied: 'You have declined ad cookies.',
  pending: 'You haven’t chosen yet, so no ad cookies are used.',
}

/**
 * On /privacy: see and change the ad cookie choice made in the banner.
 * Declining after accepting reloads the page, so the pixel scripts already
 * running on it are gone too.
 */
export function ConsentChoice() {
  const isClient = useIsClient()
  const status = useConsentStatus()

  // Same height before and after hydration, so nothing jumps
  if (!isClient) return <div className="min-h-[5.5rem]" aria-hidden="true" />

  if (!pixelsConfigured()) {
    return <p className="rounded-xl bg-white p-4 ring-1 ring-forest/10">Ad cookies are switched off on this shop at the moment, so there is nothing to choose.</p>
  }

  function choose(next: 'granted' | 'denied') {
    const { meta, tiktok } = loadedPixels()
    setConsent(next)
    if (next === 'denied' && (meta || tiktok)) window.location.reload()
  }

  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-forest/10">
      <p role="status" aria-live="polite" className="font-semibold text-charcoal">
        {LABEL[status]}
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" aria-pressed={status === 'granted'} className={`${BUTTON} ${status === 'granted' ? ON : OFF}`} onClick={() => choose('granted')}>
          Allow ad cookies
        </button>
        <button type="button" aria-pressed={status === 'denied'} className={`${BUTTON} ${status === 'denied' ? ON : OFF}`} onClick={() => choose('denied')}>
          Decline ad cookies
        </button>
      </div>
    </div>
  )
}
