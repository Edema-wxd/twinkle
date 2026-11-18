'use client'

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import Image from 'next/image'
import { useDialogFocus } from '@/lib/useDialogFocus'
import { SIZE_GUIDE_SIZES, type LandingConfig } from '@/lib/landing/config'
import { canOptimise } from '@/lib/landing/images'
import { Copy, DisplayText, PhotoNeeded } from './Copy'
import { LandingWhatsAppLink } from './LandingWhatsAppLink'
import { CloseIcon, WhatsAppIcon } from './icons'

type Guide = LandingConfig['sizeGuide']

const SizeGuideContext = createContext<{ open: () => void; isOpen: boolean }>({ open: () => {}, isOpen: false })

/** Open the size guide from anywhere on the page ("Which size?" on cards, How it works) */
export function useSizeGuide() {
  return useContext(SizeGuideContext)
}

/**
 * Holds the one size guide on the page. The sheet mounts on first open (nothing
 * to download until someone asks) and stays mounted so it can animate closed.
 */
export function SizeGuideProvider({ guide, children }: { guide: Guide; children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const open = useCallback(() => {
    setMounted(true)
    // Next frame, so the sheet is in the DOM (closed) before it slides up
    requestAnimationFrame(() => setOpen(true))
  }, [])
  const close = useCallback(() => setOpen(false), [])

  return (
    <SizeGuideContext.Provider value={{ open, isOpen }}>
      {children}
      {mounted && <SizeGuideSheet guide={guide} open={isOpen} onClose={close} />}
    </SizeGuideContext.Provider>
  )
}

/** "Open the size guide" (or any label) as a real button */
export function SizeGuideButton({ className, children }: { className?: string; children: React.ReactNode }) {
  const { open, isOpen } = useSizeGuide()
  return (
    <button type="button" onClick={open} aria-haspopup="dialog" aria-expanded={isOpen} className={className}>
      {children}
    </button>
  )
}

/**
 * Bottom sheet on phones, centred modal on desktop. Traps focus, closes on Escape,
 * backdrop tap and swipe down, and gives focus back to the button that opened it.
 */
export function SizeGuideSheet({ guide, open, onClose }: { guide: Guide; open: boolean; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const [drag, setDrag] = useState(0)
  const dragStart = useRef<number | null>(null)
  useDialogFocus(panelRef, open)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [open, onClose])

  // Swipe down to close (phones), only when the sheet is scrolled to the top
  function onTouchStart(e: React.TouchEvent) {
    dragStart.current = (panelRef.current?.scrollTop ?? 0) <= 0 ? e.touches[0].clientY : null
  }
  function onTouchMove(e: React.TouchEvent) {
    if (dragStart.current === null) return
    setDrag(Math.max(0, e.touches[0].clientY - dragStart.current))
  }
  function onTouchEnd() {
    if (dragStart.current !== null && drag > 80) onClose()
    dragStart.current = null
    setDrag(0)
  }

  return (
    <div className={`fixed inset-0 z-[70] ${open ? '' : 'pointer-events-none'}`}>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`absolute inset-0 bg-forest/60 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        inert={!open}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}
        className={`absolute inset-x-0 bottom-0 max-h-[88svh] overflow-y-auto overscroll-contain rounded-t-3xl bg-cream pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl transition-[transform,opacity] duration-300 ease-out md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:max-h-[85vh] md:w-[min(44rem,calc(100vw-4rem))] md:-translate-x-1/2 md:rounded-3xl ${
          open ? 'translate-y-0 md:-translate-y-1/2 md:opacity-100' : 'translate-y-full md:-translate-y-[45%] md:opacity-0'
        }`}
      >
        <div className="sticky top-0 z-10 bg-cream/95 px-5 pb-3 pt-2 backdrop-blur md:px-8 md:pt-6">
          <span aria-hidden="true" className="mx-auto mb-3 block h-1.5 w-12 rounded-full bg-charcoal/20 md:hidden" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="font-display text-[1.75rem] leading-[1.25] text-forest">
                <DisplayText text="Find your size" />
              </h2>
              <p className="mt-1 font-body text-sm text-charcoal/80">Match the bead to the thickness of your locs.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close size guide"
              className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-forest hover:bg-forest/5 focus-visible:outline-2 focus-visible:outline-forest"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        <ul className="grid gap-4 px-5 pt-2 sm:grid-cols-3 md:px-8">
          {SIZE_GUIDE_SIZES.map((size) => {
            const photo = guide.photos[size]
            return (
              <li key={size} className="overflow-hidden rounded-2xl bg-white ring-1 ring-forest/10 max-sm:flex">
                <div className="relative aspect-square shrink-0 bg-stone max-sm:w-28">
                  {photo ? (
                    <Image
                      src={photo.url}
                      alt={photo.alt || `${size} Twinkles bead on a loc`}
                      fill
                      sizes="(min-width: 640px) 200px, 112px"
                      unoptimized={!canOptimise(photo.url)}
                      className="object-cover"
                    />
                  ) : (
                    <PhotoNeeded label={`${size} bead on a loc`} className="absolute inset-0 !p-2 text-xs" />
                  )}
                </div>
                <div className="p-4">
                  <p className="font-heading text-lg font-bold text-forest">{size}</p>
                  <p className="mt-1 font-body text-sm leading-normal text-charcoal/80">
                    <Copy text={guide.descriptions[size]} />
                  </p>
                </div>
              </li>
            )
          })}
        </ul>

        <div className="px-5 pt-5 md:px-8">
          <p className="font-body text-base font-semibold text-forest">
            <Copy text={guide.betweenSizesLine} />
          </p>
          <LandingWhatsAppLink
            location="sizeguide"
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-whatsapp-dark px-6 font-heading text-base font-semibold text-white transition-colors hover:bg-whatsapp-darker focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest sm:w-auto"
          >
            <WhatsAppIcon />
            Send us a photo on WhatsApp
          </LandingWhatsAppLink>
        </div>
      </div>
    </div>
  )
}
