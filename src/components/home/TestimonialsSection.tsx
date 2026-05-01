'use client'

import { useState, useEffect } from 'react'
export interface Testimonial {
  id: string
  name: string
  quote: string
}

interface TestimonialsSectionProps {
  testimonials: Testimonial[]
}

export function TestimonialsSection({ testimonials }: TestimonialsSectionProps) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setIdx(i => (i + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(id)
  }, [testimonials.length])

  const t = testimonials[idx]

  return (
    <section className="bg-stone py-20 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <p className="font-body text-sm text-terracotta uppercase tracking-widest mb-3">
          What our customers say
        </p>
        <h2 className="font-display text-4xl md:text-5xl text-cocoa leading-tight mb-12">
          Loved by Loc Wearers
        </h2>

        <div className="bg-cream rounded-2xl p-8 md:p-10 shadow-xs">
          <p className="font-display text-6xl text-gold/30 leading-none mb-2">&ldquo;</p>
          <blockquote className="font-body text-lg text-charcoal/80 italic mb-6 leading-relaxed">
            &ldquo;{t.quote}&rdquo;
          </blockquote>
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gold flex items-center justify-center flex-shrink-0">
              <span className="font-heading font-semibold text-cocoa text-sm">
                {t.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <span className="font-heading font-medium text-cocoa">{t.name}</span>
          </div>
        </div>

        <div className="flex justify-center gap-2 mt-8">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Go to testimonial ${i + 1}`}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i === idx ? 'bg-gold' : 'bg-charcoal/20 hover:bg-charcoal/40'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
