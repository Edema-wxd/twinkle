'use client'

import { useEffect, useState } from 'react'

export interface Testimonial {
  id: string
  name: string
  quote: string
}

interface TestimonialsSectionProps {
  testimonials: Testimonial[]
}

const INTERVAL_MS = 6000

export function TestimonialsSection({ testimonials }: TestimonialsSectionProps) {
  const [idx, setIdx] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [userPaused, setUserPaused] = useState(false)
  const paused = hovered || userPaused
  const [reducedMotion, setReducedMotion] = useState(false)
  const count = testimonials.length

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onChange = () => setReducedMotion(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (count < 2 || paused || reducedMotion) return
    const id = setInterval(() => setIdx((i) => (i + 1) % count), INTERVAL_MS)
    return () => clearInterval(id)
  }, [count, paused, reducedMotion])

  if (count === 0) return null

  const t = testimonials[Math.min(idx, count - 1)]
  const initials = t.name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Customer testimonials"
      className="relative overflow-hidden bg-stone py-20 px-4"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <div aria-hidden="true" className="absolute inset-0 bg-pattern-01 opacity-[0.05] pointer-events-none z-0" />
      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <p className="font-heading text-xs font-semibold text-gold-deep uppercase tracking-[0.2em] mb-6">
          What our customers say
        </p>
        <h2 className="font-display text-4xl md:text-5xl text-forest leading-[1.2] mb-12">
          Loved by loc wearers
        </h2>

        <figure className="bg-cream rounded-2xl p-8 md:p-10 shadow-xs min-h-[16rem] flex flex-col justify-center" aria-live={paused ? 'polite' : 'off'}>
          <span aria-hidden="true" className="font-display text-6xl text-gold leading-none mb-2">&ldquo;</span>
          <blockquote key={t.id} className="font-body text-lg text-charcoal/85 italic mb-6 leading-relaxed">
            {t.quote}
          </blockquote>
          <figcaption className="flex items-center justify-center gap-3">
            <span aria-hidden="true" className="w-10 h-10 rounded-full bg-forest flex items-center justify-center shrink-0 font-heading font-semibold text-gold-light text-sm">
              {initials}
            </span>
            <span className="font-heading font-medium text-forest">{t.name}</span>
          </figcaption>
        </figure>

        {count > 1 && (
          <div className="flex items-center justify-center gap-1 mt-8">
            {testimonials.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Show testimonial ${i + 1} of ${count}`}
                aria-current={i === idx ? 'true' : undefined}
                className="group w-11 h-11 flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <span className={`block h-2.5 rounded-full transition-all ${i === idx ? 'w-6 bg-forest' : 'w-2.5 bg-charcoal/25 group-hover:bg-charcoal/50'}`} />
              </button>
            ))}
            {!reducedMotion && (
              <button
                type="button"
                onClick={() => setUserPaused((p) => !p)}
                aria-label={userPaused ? 'Play testimonials' : 'Pause testimonials'}
                className="ml-2 w-11 h-11 flex items-center justify-center rounded-full text-forest hover:bg-forest/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                {userPaused ? (
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
