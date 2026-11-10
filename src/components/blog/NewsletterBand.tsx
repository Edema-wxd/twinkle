import { NewsletterForm } from '@/components/layout/NewsletterForm'

export function NewsletterBand({
  title = 'Loc care notes, straight to your inbox',
  body = 'New styling guides, restock alerts and the occasional members-only code. No spam, unsubscribe anytime.',
}: {
  title?: string
  body?: string
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-forest px-6 py-12 md:px-12">
      <div aria-hidden="true" className="absolute inset-0 bg-pattern-02 opacity-[0.07]" />
      <div className="relative grid gap-8 md:grid-cols-[1fr_minmax(0,26rem)] md:items-center">
        <div>
          <p className="font-heading text-xs font-semibold uppercase tracking-[0.2em] text-gold-light">The Twinkle family</p>
          <h2 className="mt-3 font-display text-4xl leading-tight text-cream md:text-5xl">{title}</h2>
          <p className="mt-3 max-w-md font-body text-cream/80 leading-relaxed">{body}</p>
        </div>
        <NewsletterForm cta="Count me in" />
      </div>
    </section>
  )
}
