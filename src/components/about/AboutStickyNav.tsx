'use client'

import { useState, useEffect } from 'react'

/** Pill nav built from the real section list so DB ids/titles always match. */
export function AboutStickyNav({ sections }: { sections: { id: string; title: string }[] }) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '')

  useEffect(() => {
    const observers: IntersectionObserver[] = []
    sections.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (!el) return
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) setActiveId(id)
          })
        },
        { rootMargin: '-30% 0px -60% 0px' },
      )
      observer.observe(el)
      observers.push(observer)
    })
    return () => observers.forEach((obs) => obs.disconnect())
  }, [sections])

  if (sections.length < 2) return null

  return (
    // top-20 clears the 64px sticky site header; z-20 keeps it beneath header (z-30)
    <nav className="sticky top-20 z-20 flex justify-center my-8" aria-label="Page sections">
      <ul className="flex max-w-full gap-1 overflow-x-auto [scrollbar-width:none] bg-white/85 backdrop-blur-sm rounded-full p-1.5 shadow-md ring-1 ring-forest/10">
        {sections.map(({ id, title }) => (
          <li key={id} className="shrink-0">
            <a
              href={`#${id}`}
              aria-current={activeId === id ? 'location' : undefined}
              className={`inline-flex min-h-10 items-center px-4 rounded-full font-heading text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                activeId === id ? 'bg-forest text-cream' : 'text-charcoal/75 hover:text-forest'
              }`}
            >
              {title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
