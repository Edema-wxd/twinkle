'use client'

import { Children, useEffect, useId, useRef, useState } from 'react'
import { ChevronIcon } from './icons'

type Props = {
  /** Accessible name, e.g. "Gold Twinkles photos" */
  label: string
  /** What one slide is, for the button labels ("photo", "review") */
  noun: string
  /** Width of each slide, e.g. "w-full" or "w-[85%] lg:w-[calc((100%-3rem)/3)]" */
  slideClassName: string
  /** Gap between slides; must match the calc() in slideClassName */
  gapClassName?: string
  /** Buttons over the slides (product photos) or under them (reviews) */
  controls: 'overlay' | 'below'
  /** On phones, let slides run to the screen edges (the next one peeks in) */
  bleed?: boolean
  children: React.ReactNode
}

/**
 * Swipe carousel: native scroll-snap (swipe and keyboard arrows work with no JS),
 * plus visible previous/next buttons. Never autoplays.
 */
export function Carousel({ label, noun, slideClassName, gapClassName = 'gap-0', controls, bleed = false, children }: Props) {
  const slides = Children.toArray(children)
  const count = slides.length
  const trackId = useId()
  const trackRef = useRef<HTMLUListElement>(null)
  const [index, setIndex] = useState(0)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(count <= 1)

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    let raf = 0
    const update = () => {
      raf = 0
      const step = stepOf(el)
      setIndex(step ? Math.min(count - 1, Math.round(el.scrollLeft / step)) : 0)
      setAtStart(el.scrollLeft <= 2)
      setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    el.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [count])

  function go(dir: 1 | -1) {
    const el = trackRef.current
    if (!el) return
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollBy?.({ left: dir * stepOf(el), behavior: reduce ? 'auto' : 'smooth' })
  }

  const showControls = count > 1
  const btn =
    'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cream/95 text-forest shadow-md ring-1 ring-forest/15 transition-opacity hover:bg-white disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest'
  const prev = (
    <button type="button" className={btn} onClick={() => go(-1)} disabled={atStart} aria-controls={trackId} aria-label={`Previous ${noun}`}>
      <ChevronIcon dir="left" />
    </button>
  )
  const next = (
    <button type="button" className={btn} onClick={() => go(1)} disabled={atEnd} aria-controls={trackId} aria-label={`Next ${noun}`}>
      <ChevronIcon dir="right" />
    </button>
  )

  return (
    <div role="group" aria-roledescription="carousel" aria-label={label} className="relative">
      <ul
        id={trackId}
        ref={trackRef}
        tabIndex={showControls ? 0 : undefined}
        aria-label={showControls ? `${label}, swipe or use the arrow keys` : undefined}
        className={`flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-forest [&::-webkit-scrollbar]:hidden ${gapClassName} ${
          bleed ? '-mx-4 scroll-px-4 px-4 md:mx-0 md:scroll-px-0 md:px-0' : ''
        }`}
      >
        {slides.map((slide, i) => (
          <li key={i} className={`shrink-0 snap-start ${slideClassName}`}>
            {slide}
          </li>
        ))}
      </ul>

      {showControls && controls === 'overlay' && (
        <>
          <div className="pointer-events-none absolute inset-x-2 top-1/2 flex -translate-y-1/2 justify-between [&>*]:pointer-events-auto">
            {prev}
            {next}
          </div>
          <span aria-hidden="true" className="absolute bottom-3 right-3 rounded-full bg-forest/80 px-2.5 py-1 font-heading text-xs font-semibold text-cream">
            {index + 1} / {count}
          </span>
        </>
      )}

      {showControls && controls === 'below' && (
        <div className="mt-6 flex items-center justify-end gap-3">
          <span aria-hidden="true" className="mr-auto font-heading text-sm font-semibold text-forest/80 lg:invisible">
            {index + 1} / {count}
          </span>
          {prev}
          {next}
        </div>
      )}
    </div>
  )
}

/** Distance from one slide to the next (width plus gap) */
function stepOf(el: HTMLElement): number {
  const a = el.children[0] as HTMLElement | undefined
  const b = el.children[1] as HTMLElement | undefined
  if (!a) return 0
  return b ? b.offsetLeft - a.offsetLeft : a.offsetWidth
}
