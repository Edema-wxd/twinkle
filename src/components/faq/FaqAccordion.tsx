'use client'

import { useState } from 'react'
import { Faq } from '@/types/db'

interface FaqAccordionProps {
  faqs: Faq[]
}

export function FaqAccordion({ faqs }: FaqAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(null)

  const grouped = faqs.reduce<Record<string, Faq[]>>((acc, faq) => {
    acc[faq.category] ??= []
    acc[faq.category].push(faq)
    return acc
  }, {})

  if (faqs.length === 0) {
    return (
      <p className="text-charcoal/50 text-sm">No FAQs yet — check back soon.</p>
    )
  }

  return (
    <div className="space-y-10">
      {Object.entries(grouped).map(([categoryName, items]) => (
        <section key={categoryName}>
          <h2 className="font-heading text-sm font-semibold uppercase tracking-widest text-gold mb-4">
            {categoryName}
          </h2>
          <div className="divide-y divide-stone-200">
            {items.map((faq) => {
              const isOpen = openId === faq.id
              return (
                <div key={faq.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : faq.id)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-4 py-4 text-left"
                  >
                    <span className="font-heading text-base font-medium text-charcoal">
                      {faq.question}
                    </span>
                    <span
                      className="shrink-0 text-gold text-xl leading-none font-light select-none"
                      aria-hidden="true"
                    >
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>
                  {/* Height animation via CSS grid trick — no JS measurement */}
                  <div
                    className={`grid overflow-hidden transition-all duration-200 ${
                      isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="pb-4 text-charcoal/70 text-sm leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
