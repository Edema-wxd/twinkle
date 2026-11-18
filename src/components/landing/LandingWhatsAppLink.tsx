'use client'

import { BUSINESS } from '@/lib/config/business'
import { landingWhatsAppText, type LandingWhatsAppLocation } from '@/lib/landing/config'
import { trackEvent } from '@/lib/tracking/events'
import { readUtmCookie, utmFromSearchParams } from '@/lib/tracking/utm'

/** The ad's utm_content (stored cookie first, else the current URL), read when the link is used */
function adRef(): string | null {
  try {
    return readUtmCookie()?.content ?? utmFromSearchParams(new URLSearchParams(window.location.search))?.content ?? null
  } catch {
    return null
  }
}

/** A custom message (e.g. the international quote text from Admin → Shipping) with the same ad attribution */
function customText(text: string, ref: string | null): string {
  const clean = ref?.trim().replace(/[^\w.-]/g, '').slice(0, 40)
  return `${text} (I came from your ad${clean ? `, ref: ${clean}` : ''})`
}

type Props = {
  /** Which prefilled message to send; also the Contact event's location */
  location: LandingWhatsAppLocation
  /** Contact event location when it differs from the message (e.g. 'footer', 'shipping') */
  trackAs?: string
  /** Send this text instead of the location's message */
  text?: string
  className?: string
  children: React.ReactNode
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick' | 'children'>

/**
 * Every WhatsApp link on the landing page. The prefilled text keeps "came from
 * your ad" and adds the ad's utm_content as a ref, read on tap, so WhatsApp sales
 * can be traced to the creative. Fires the Contact event.
 */
export function LandingWhatsAppLink({ location, trackAs, text, className, children, ...rest }: Props) {
  const message = (ref: string | null) => (text ? customText(text, ref) : landingWhatsAppText(location, ref))

  function refresh(e: React.MouseEvent<HTMLAnchorElement>) {
    e.currentTarget.href = BUSINESS.whatsapp.url(message(adRef()))
  }

  return (
    <a
      {...rest}
      href={BUSINESS.whatsapp.url(message(null))}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={(e) => {
        refresh(e)
        trackEvent({ name: 'Contact', location: trackAs ?? location })
      }}
      onAuxClick={refresh}
      onContextMenu={refresh}
    >
      {children}
    </a>
  )
}
