'use client'

import { useId, useMemo, useState } from 'react'

export type FaqItem = {
  id: string
  category: string
  question: string
  /** Pre-sanitised HTML */
  answerHtml: string
  /** Plain text, used for search */
  answerText: string
}

interface FaqAccordionProps {
  faqs: FaqItem[]
  /** Show search + category chips (full /faq page). Off for compact home-page teaser. */
  withControls?: boolean
  /** Visual tone of the surface it sits on */
  tone?: 'light' | 'white'
}

export function FaqAccordion({ faqs, withControls = true, tone = 'light' }: FaqAccordionProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const searchId = useId()

  const q = query.trim().toLowerCase()
  const visible = useMemo(
    () => (q ? faqs.filter((f) => f.question.toLowerCase().includes(q) || f.answerText.toLowerCase().includes(q)) : faqs),
    [faqs, q],
  )

  const grouped = useMemo(() => {
    const map = new Map<string, FaqItem[]>()
    for (const f of visible) {
      if (!map.has(f.category)) map.set(f.category, [])
      map.get(f.category)!.push(f)
    }
    return [...map.entries()]
  }, [visible])

  const categories = useMemo(() => [...new Set(faqs.map((f) => f.category))], [faqs])

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (faqs.length === 0) {
    return <p className="font-body text-charcoal/70">No questions here yet. Message us on WhatsApp and we&apos;ll answer personally.</p>
  }

  const showHeadings = withControls && grouped.length > 1

  return (
    <div>
      {withControls && (
        <div className="mb-10 space-y-4">
          <div className="relative">
            <label htmlFor={searchId} className="sr-only">Search questions</label>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-forest/50" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search, e.g. fade, sizes, delivery"
              className="w-full min-h-12 rounded-full bg-white pl-12 pr-4 font-body text-base text-charcoal placeholder:text-charcoal/50 ring-1 ring-forest/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            />
          </div>
          {!q && categories.length > 1 && (
            <nav aria-label="FAQ categories" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
              <ul className="flex w-max gap-2">
                {categories.map((c) => (
                  <li key={c}>
                    <a
                      href={`#faq-${slug(c)}`}
                      className="inline-flex min-h-10 items-center rounded-full bg-white/70 px-4 font-heading text-sm font-medium text-forest ring-1 ring-forest/15 transition-colors hover:ring-forest/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                    >
                      {c}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          {q && (
            <p aria-live="polite" className="font-body text-sm text-charcoal/70">
              {visible.length} {visible.length === 1 ? 'answer' : 'answers'} for &ldquo;{query.trim()}&rdquo;
            </p>
          )}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="rounded-2xl bg-white px-6 py-8 text-center font-body text-charcoal/75 ring-1 ring-forest/10">
          No answer matches that yet. Ask us on WhatsApp, we usually reply within the hour.
        </p>
      ) : (
        <div className="space-y-12">
          {grouped.map(([categoryName, items]) => (
            <section key={categoryName} id={`faq-${slug(categoryName)}`} className="scroll-mt-28">
              {showHeadings && (
                <h2 className="mb-4 font-heading text-xs font-semibold uppercase tracking-[0.2em] text-gold-deep">{categoryName}</h2>
              )}
              <ul className={`divide-y divide-forest/10 overflow-hidden rounded-2xl ring-1 ring-forest/10 ${tone === 'white' ? 'bg-stone' : 'bg-white'}`}>
                {items.map((faq) => {
                  const isOpen = openIds.has(faq.id) || (q.length > 0 && visible.length <= 3)
                  const panelId = `faq-panel-${faq.id}`
                  return (
                    <li key={faq.id}>
                      <h3>
                        <button
                          type="button"
                          onClick={() => toggle(faq.id)}
                          aria-expanded={isOpen}
                          aria-controls={panelId}
                          className="flex w-full items-center justify-between gap-6 px-5 py-5 text-left transition-colors hover:bg-forest/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold md:px-6"
                        >
                          <span className="font-heading text-base font-semibold text-forest">{faq.question}</span>
                          <span
                            aria-hidden="true"
                            className={`relative h-8 w-8 shrink-0 rounded-full ring-1 ring-forest/15 transition-[transform,background-color] duration-300 ${isOpen ? 'rotate-45 bg-forest' : ''}`}
                          >
                            <span className={`absolute left-1/2 top-1/2 h-px w-3 -translate-x-1/2 -translate-y-1/2 ${isOpen ? 'bg-cream' : 'bg-forest'}`} />
                            <span className={`absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 ${isOpen ? 'bg-cream' : 'bg-forest'}`} />
                          </span>
                        </button>
                      </h3>
                      {/* Height animation via CSS grid trick, no JS measurement */}
                      <div
                        id={panelId}
                        role="region"
                        aria-label={faq.question}
                        className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                        inert={!isOpen}
                      >
                        <div className="overflow-hidden">
                          <div
                            className="tl-prose tl-prose--compact px-5 pb-6 md:px-6"
                            dangerouslySetInnerHTML={{ __html: faq.answerHtml }}
                          />
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
