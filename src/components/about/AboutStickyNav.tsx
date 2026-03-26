'use client'

import { useState, useEffect } from 'react'

const SECTIONS = [
  { id: 'founder-story', label: 'Founder Story' },
  { id: 'brand-mission', label: 'Brand Mission' },
  { id: 'why-loc-beads', label: 'Why Loc Beads' },
  { id: 'contact', label: 'Contact' },
]

export function AboutStickyNav() {
  const [activeId, setActiveId] = useState<string>(SECTIONS[0].id)

  useEffect(() => {
    const observers: IntersectionObserver[] = []

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (!el) return

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveId(id)
            }
          })
        },
        {
          rootMargin: '-30% 0px -60% 0px',
        }
      )

      observer.observe(el)
      observers.push(observer)
    })

    return () => {
      observers.forEach((obs) => obs.disconnect())
    }
  }, [])

  function handleClick(id: string) {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <nav
      className="sticky top-4 z-30 flex justify-center my-8"
      aria-label="Page sections"
    >
      <div className="flex gap-2 bg-white/80 backdrop-blur-sm rounded-full px-3 py-2 shadow-md border border-stone-200">
        {SECTIONS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => handleClick(id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeId === id
                ? 'bg-gold text-white'
                : 'text-charcoal/60 hover:text-charcoal'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </nav>
  )
}
