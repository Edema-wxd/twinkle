import Link from 'next/link'
import { FaqAccordion, type FaqItem } from '@/components/faq/FaqAccordion'

export function FaqTeaserSection({ faqs }: { faqs: FaqItem[] }) {
  if (faqs.length === 0) return null

  return (
    <section aria-labelledby="faq-teaser" className="bg-stone px-4 py-20">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
        <div>
          <p className="font-heading text-xs font-semibold uppercase tracking-[0.2em] text-gold-deep">Good to know</p>
          <h2 id="faq-teaser" className="mt-6 font-display text-4xl leading-[1.2] text-forest md:text-5xl">Before you bead</h2>
          <p className="mt-4 max-w-sm font-body leading-relaxed text-charcoal/75">
            The questions we hear most on WhatsApp, answered.
          </p>
          <Link
            href="/faq"
            className="mt-6 inline-flex min-h-11 items-center font-heading text-sm font-semibold text-forest underline decoration-gold decoration-2 underline-offset-4 hover:text-gold-deep"
          >
            See every answer &rarr;
          </Link>
        </div>
        <FaqAccordion faqs={faqs} withControls={false} tone="light" />
      </div>
    </section>
  )
}
