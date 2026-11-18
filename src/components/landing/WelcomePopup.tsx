'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useDialogFocus } from '@/lib/useDialogFocus'
import { useCart } from '@/lib/cart/CartContext'
import { useConsentStatus } from '@/lib/tracking/consent'
import type { LandingConfig } from '@/lib/landing/config'
import { EmailCapture, SIGNED_UP_KEY } from './EmailCapture'
import { useSizeGuide } from './SizeGuide'
import { CloseIcon } from './icons'

const SEEN_KEY = 'tl_lp_welcome_seen'
const DELAY_MS = 25_000

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/**
 * The welcome offer as a pop-up (only when switched on in Admin). Once per visitor,
 * after 25 s or on exit intent (desktop); on phones never before the first scroll.
 * Bottom sheet on phones, small modal on desktop; closes on ×, Escape or backdrop.
 * Waits while the cookie banner, the cart or the size guide is open.
 */
export function WelcomePopup({ offer }: { offer: LandingConfig['welcomeOffer'] }) {
  const [wanted, setWanted] = useState(false)
  const [closed, setClosed] = useState(false)
  const consent = useConsentStatus()
  const { state } = useCart()
  const sizeGuide = useSizeGuide()
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (storageGet(SEEN_KEY) || storageGet(SIGNED_UP_KEY)) return
    const phone = matchMedia('(max-width: 767px), (pointer: coarse)').matches
    let elapsed = false
    let scrolled = !phone
    const maybe = () => {
      if (elapsed && scrolled) setWanted(true)
    }
    const timer = window.setTimeout(() => {
      elapsed = true
      maybe()
    }, DELAY_MS)
    const onScroll = () => {
      scrolled = true
      maybe()
    }
    // Exit intent: the pointer leaves through the top of the window (desktop only)
    const onLeave = (e: MouseEvent) => {
      if (!phone && !e.relatedTarget && e.clientY <= 0) setWanted(true)
    }
    window.addEventListener('scroll', onScroll, { passive: true, once: true })
    document.addEventListener('mouseout', onLeave)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('mouseout', onLeave)
    }
  }, [])

  const open = wanted && !closed && consent !== 'pending' && !state.isDrawerOpen && !sizeGuide.isOpen

  useEffect(() => {
    if (!open) return
    try {
      localStorage.setItem(SEEN_KEY, '1')
    } catch {
      // storage blocked: it may show again on a later visit
    }
  }, [open])

  const close = useCallback(() => setClosed(true), [])
  useDialogFocus(panelRef, open)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  if (!wanted || closed) return null

  return (
    <div className={`fixed inset-0 z-[75] ${open ? '' : 'invisible'}`}>
      <div aria-hidden="true" onClick={close} className="absolute inset-0 bg-forest/50" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        inert={!open}
        className="absolute inset-x-0 bottom-0 max-h-[85svh] overflow-y-auto rounded-t-3xl bg-cream px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-12 shadow-2xl md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-[min(32rem,calc(100vw-4rem))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl md:px-8 md:pb-8"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-forest hover:bg-forest/5 focus-visible:outline-2 focus-visible:outline-forest"
        >
          <CloseIcon />
        </button>
        <EmailCapture offer={offer} tone="light" headingAs="h2" headingId={titleId} />
        <button
          type="button"
          onClick={close}
          className="mt-4 min-h-11 w-full font-body text-sm font-semibold text-charcoal/80 underline underline-offset-4 hover:text-forest"
        >
          No thanks
        </button>
      </div>
    </div>
  )
}
