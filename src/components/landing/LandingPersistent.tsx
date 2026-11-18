'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useCart } from '@/lib/cart/CartContext'
import { useConsentStatus } from '@/lib/tracking/consent'
import { trackEvent } from '@/lib/tracking/events'
import type { LandingConfig } from '@/lib/landing/config'
import { canOptimise } from '@/lib/landing/images'
import { formatNaira } from '@/lib/landing/selection'
import { LandingWhatsAppLink } from './LandingWhatsAppLink'
import { WelcomePopup } from './WelcomePopup'
import { WhatsAppIcon } from './icons'

type Props = {
  /** Featured product ids, for ViewContent */
  productIds: string[]
  /** Lowest preselected card price, for "Twinkles from ₦X" (null hides the bar) */
  lowestPrice: number | null
  thumbnail: string | null
  offer: LandingConfig['welcomeOffer']
}

type OnScreen = { heroPassed: boolean; bestSellers: boolean; finalCta: boolean; footer: boolean }

/**
 * Everything that floats or runs once for the whole page: the ViewContent event,
 * the fade-up on sections, the phone sticky buy bar, the WhatsApp button and the
 * welcome pop-up. The bar and button stay hidden while the cookie banner is up
 * (it sits at the bottom of the screen) and while the cart is open.
 */
export function LandingPersistent({ productIds, lowestPrice, thumbnail, offer }: Props) {
  const consent = useConsentStatus()
  const { state } = useCart()
  const [onScreen, setOnScreen] = useState<OnScreen>({ heroPassed: false, bestSellers: false, finalCta: false, footer: false })

  // ViewContent, once per page view
  const viewSent = useRef(false)
  useEffect(() => {
    if (viewSent.current) return
    viewSent.current = true
    trackEvent({ name: 'ViewContent', contentIds: productIds })
  }, [productIds])

  // Which landmarks are on screen: drives the sticky bar and the button
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const watched = new Map<Element, keyof OnScreen>()
    const add = (selector: string, key: keyof OnScreen) => {
      const el = document.querySelector(selector)
      if (el) watched.set(el, key)
    }
    add('#lp-hero', 'heroPassed')
    add('#best-sellers', 'bestSellers')
    add('#final-cta', 'finalCta')
    add('[data-site-footer]', 'footer')
    const io = new IntersectionObserver((entries) => {
      setOnScreen((prev) => {
        const next = { ...prev }
        for (const e of entries) {
          const key = watched.get(e.target)
          if (!key) continue
          // The hero counts as passed once it has scrolled off the top
          next[key] = key === 'heroPassed' ? !e.isIntersecting && e.boundingClientRect.top < 0 : e.isIntersecting
        }
        return next
      })
    })
    watched.forEach((_, el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  // Fade-up as sections come into view (only those still below the fold; none with reduced motion)
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          ;(e.target as HTMLElement).dataset.reveal = 'shown'
          io.unobserve(e.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
      if (el.getBoundingClientRect().top > window.innerHeight) {
        el.dataset.reveal = 'hidden'
        io.observe(el)
      }
    })
    return () => io.disconnect()
  }, [])

  const clear = consent !== 'pending' && !state.isDrawerOpen
  const barVisible = clear && lowestPrice !== null && onScreen.heroPassed && !onScreen.bestSellers && !onScreen.finalCta && !onScreen.footer
  const fabVisible = clear && !onScreen.footer

  return (
    <>
      {/* Phones only: appears once the hero has gone, steps aside for Best-sellers, the final CTA and the footer */}
      <div
        aria-hidden={!barVisible || undefined}
        inert={!barVisible}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-forest/10 bg-cream/95 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur transition-transform duration-300 md:hidden ${
          barVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex h-16 items-center gap-3 px-4">
          {thumbnail && (
            <Image src={thumbnail} alt="" width={40} height={40} unoptimized={!canOptimise(thumbnail)} className="h-10 w-10 shrink-0 rounded-lg bg-stone object-cover ring-1 ring-forest/10" />
          )}
          <p className="min-w-0 flex-1 font-heading text-sm font-semibold leading-tight text-forest">
            Twinkles from <span className="whitespace-nowrap">{lowestPrice !== null ? formatNaira(lowestPrice) : ''}</span>
          </p>
          <a
            href="#best-sellers"
            className="inline-flex min-h-11 shrink-0 items-center rounded-xl bg-gold-light px-5 font-heading text-sm font-bold text-forest shadow-sm hover:bg-[#D8BC86] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
          >
            Shop now
          </a>
        </div>
      </div>

      {/* WhatsApp: bottom right, above the sticky bar when it's showing */}
      <LandingWhatsAppLink
        location="fab"
        aria-label="Chat with us on WhatsApp"
        aria-hidden={!fabVisible || undefined}
        tabIndex={fabVisible ? undefined : -1}
        className={`fixed right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-lg transition-[bottom,transform,opacity] duration-300 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest md:bottom-6 md:right-6 ${
          barVisible ? 'bottom-[calc(5rem+env(safe-area-inset-bottom))]' : 'bottom-[calc(1rem+env(safe-area-inset-bottom))]'
        } ${fabVisible ? 'opacity-100' : 'pointer-events-none translate-y-4 opacity-0'}`}
      >
        <WhatsAppIcon className="h-7 w-7" />
      </LandingWhatsAppLink>

      {offer.enabled && offer.popup && <WelcomePopup offer={offer} />}
    </>
  )
}
