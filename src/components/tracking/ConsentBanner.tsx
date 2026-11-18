'use client'

import Link from 'next/link'
import { pixelsConfigured } from '@/lib/tracking/config'
import { setConsent, useConsentStatus, useIsClient } from '@/lib/tracking/consent'

const BUTTON =
  'min-h-11 flex-1 rounded-lg border-2 border-cream px-5 font-heading text-sm font-semibold text-cream transition-colors hover:bg-cream hover:text-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-light sm:flex-none'

/**
 * Ad cookie choice, fixed to the bottom of the storefront.
 *
 * Shown only when a pixel is configured and the visitor hasn't answered yet.
 * Rendered in the browser only (never in the server HTML), so returning
 * visitors don't see it flash. It is fixed, so it never pushes content around,
 * and it isn't a dialog: the page stays usable while it is open.
 * z-[55]: above the floating buttons (z-40/z-50), below the cart drawer (z-[60]).
 */
export function ConsentBanner() {
  const isClient = useIsClient()
  const status = useConsentStatus()
  if (!isClient || !pixelsConfigured() || status !== 'pending') return null

  return (
    <section
      aria-label="Cookie choice"
      className="fixed inset-x-0 bottom-0 z-[55] border-t border-gold/40 bg-forest shadow-[0_-4px_16px_rgba(0,0,0,0.18)]"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 pt-3 sm:flex-row sm:items-center sm:gap-5">
        <p className="font-body text-sm leading-snug text-cream">
          We use cookies from Meta and TikTok to see which of our ads work. Accept or decline, either way the shop works the
          same.{' '}
          <Link
            href="/privacy#cookies"
            className="font-semibold text-cream underline decoration-gold-light underline-offset-4 hover:decoration-cream"
          >
            Privacy
          </Link>
        </p>
        <div className="flex shrink-0 gap-3">
          <button type="button" className={BUTTON} onClick={() => setConsent('granted')}>
            Accept
          </button>
          <button type="button" className={BUTTON} onClick={() => setConsent('denied')}>
            Decline
          </button>
        </div>
      </div>
    </section>
  )
}
