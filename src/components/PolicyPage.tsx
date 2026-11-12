import type { ReactNode } from 'react'

/**
 * Shared layout for policy pages (returns, privacy): the same forest header as
 * /shipping, a "last updated" date, a contents list and readable prose.
 */
export function PolicyPage({
  eyebrow,
  title,
  intro,
  updated,
  sections,
}: {
  eyebrow: string
  title: string
  intro: ReactNode
  /** e.g. '12 November 2026' */
  updated: string
  sections: { id: string; title: string; body: ReactNode }[]
}) {
  return (
    <div className="bg-cream">
      <header className="relative overflow-hidden bg-forest">
        <div aria-hidden="true" className="absolute inset-0 bg-pattern-01 opacity-[0.06]" />
        <div className="relative mx-auto max-w-3xl px-4 pt-14 pb-14 md:pt-20 md:pb-16">
          <p className="font-heading text-xs font-semibold uppercase tracking-[0.24em] text-gold-light">{eyebrow}</p>
          <h1 className="mt-8 font-display text-5xl leading-[1.2] text-cream md:mt-10 md:text-6xl">{title}</h1>
          <div className="mt-5 max-w-xl font-body text-base leading-relaxed text-cream/80 md:text-lg">{intro}</div>
          <p className="mt-6 font-body text-sm text-cream/60">Last updated {updated}</p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <nav aria-label="On this page" className="mb-12 rounded-2xl bg-white p-5 ring-1 ring-forest/10">
          <p className="font-heading text-xs font-semibold uppercase tracking-[0.14em] text-forest">On this page</p>
          <ol className="mt-3 grid gap-1.5 font-body text-sm sm:grid-cols-2">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-forest underline decoration-gold/60 underline-offset-4 hover:decoration-gold">
                  {i + 1}. {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-12">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-28">
              <h2 id={`${s.id}-h`} className="font-heading text-xl font-semibold text-forest">
                {i + 1}. {s.title}
              </h2>
              <div className="mt-3 space-y-4 font-body leading-relaxed text-charcoal/85 [&_a]:text-forest [&_a]:underline [&_a]:decoration-gold [&_a]:underline-offset-4 [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-charcoal [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
                {s.body}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
