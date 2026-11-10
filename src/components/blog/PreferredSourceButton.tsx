'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'

/**
 * Google "Preferred Sources" button.
 *
 * Readers who add Twinkle Locs as a preferred source see our stories more
 * prominently in Google Top Stories, AI Overviews and AI Mode. Sources are
 * whole domains, so this button on any post adds twinklelocs.com.
 *
 * Google's library (news.google.com/swg/js/v1/publisher.js) renders its
 * official badge into any element with the `google-add-preferred-source-btn`
 * attribute. If it can't (script blocked, unsupported language, offline), we
 * show our own link to Google's documented no-JS deeplink instead, so readers
 * always have a working way to add us.
 */

const SITE_HOST = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://twinklelocs.com').hostname.replace(/^www\./, '')
  } catch {
    return 'twinklelocs.com'
  }
})()

export const PREFERRED_SOURCE_URL = `https://www.google.com/preferences/source?q=${encodeURIComponent(SITE_HOST)}`

export function PreferredSourceButton({
  theme = 'light',
  title = 'See Twinkle Locs first on Google',
  description = 'Add us as a preferred source and our loc care guides show up more in Google Search, Top Stories and AI Overviews.',
  compact = false,
}: {
  theme?: 'light' | 'dark'
  title?: string
  description?: string
  compact?: boolean
}) {
  const slotRef = useRef<HTMLDivElement>(null)
  const [googleRendered, setGoogleRendered] = useState(false)

  // Hide our fallback once Google's badge has actually rendered into the slot
  useEffect(() => {
    const slot = slotRef.current
    if (!slot) return
    const check = () => setGoogleRendered(slot.childElementCount > 0 || !!slot.shadowRoot)
    check()
    const mo = new MutationObserver(check)
    mo.observe(slot, { childList: true, subtree: true })
    return () => mo.disconnect()
  }, [])

  const dark = theme === 'dark'

  return (
    <div
      className={`rounded-2xl p-5 md:p-6 ${
        dark ? 'bg-forest text-cream ring-1 ring-cream/15' : 'bg-white text-charcoal ring-1 ring-forest/10'
      } ${compact ? '' : 'flex flex-col gap-4 sm:flex-row sm:items-center'}`}
    >
      <Script src="https://news.google.com/swg/js/v1/publisher.js" strategy="afterInteractive" />
      <div className="flex-1">
        <p className={`font-heading font-semibold ${dark ? 'text-cream' : 'text-forest'}`}>{title}</p>
        {!compact && <p className={`mt-1 font-body text-sm ${dark ? 'text-cream/80' : 'text-charcoal/75'}`}>{description}</p>}
      </div>
      <div className={`shrink-0 ${compact ? 'mt-3' : ''}`}>
        {/* Google renders its official badge here */}
        <div ref={slotRef} google-add-preferred-source-btn="" data-theme={theme} />
        {!googleRendered && (
          <a
            href={PREFERRED_SOURCE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex min-h-11 items-center gap-2 rounded-full px-5 font-heading text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 ${
              dark
                ? 'bg-cream text-forest hover:bg-white focus-visible:ring-offset-forest'
                : 'bg-forest text-cream hover:bg-forest/90'
            }`}
          >
            <GoogleG />
            Add as a preferred source
          </a>
        )}
      </div>
    </div>
  )
}

function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}
