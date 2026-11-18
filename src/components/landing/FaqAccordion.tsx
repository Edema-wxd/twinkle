import { hasPlaceholder } from '@/lib/landing/config'
import type { LandingFaqItem } from '@/lib/landing/data'
import { Copy, DisplayText, SignOffLabel } from './Copy'
import { LandingWhatsAppLink } from './LandingWhatsAppLink'
import { CONTAINER, H2, REVEAL, SECTION_Y, TEXT_LINK } from './ui'

/** JSON-LD for the questions shown, so search and AI answers can quote them */
export function faqJsonLd(faqs: LandingFaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answerText } })),
  }
}

/**
 * Pre-purchase questions. Native <details> sharing one name: one open at a time,
 * all closed by default, keyboard and screen-reader friendly, with no JavaScript.
 */
export function FaqAccordion({ faqs }: { faqs: LandingFaqItem[] }) {
  if (!faqs.length) return null
  return (
    <section aria-labelledby="faq-title" data-reveal className={`bg-stone ${SECTION_Y} ${REVEAL}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faqs)).replace(/</g, '\\u003c') }} />
      <div className={CONTAINER}>
        <div className="mx-auto max-w-[800px]">
          <h2 id="faq-title" className={H2}>
            <DisplayText text="Questions, answered" />
          </h2>
          <div className="mt-8 divide-y divide-forest/10 overflow-hidden rounded-3xl bg-white ring-1 ring-forest/10 md:mt-10">
            {faqs.map((f) => {
              const needsSignOff = hasPlaceholder(f.answerText)
              return (
                <details key={f.id} name="lp-faq" className="group">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-5 px-5 py-4 transition-colors hover:bg-forest/[0.03] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-forest md:px-6 [&::-webkit-details-marker]:hidden">
                    <span className="font-heading text-base font-semibold text-forest">
                      <Copy text={f.question} />
                      {needsSignOff && !hasPlaceholder(f.question) && <SignOffLabel>Answer needs sign-off</SignOffLabel>}
                    </span>
                    <span
                      aria-hidden="true"
                      className="relative h-8 w-8 shrink-0 rounded-full ring-1 ring-forest/20 transition-[transform,background-color] duration-200 group-open:rotate-45 group-open:bg-forest"
                    >
                      <span className="absolute left-1/2 top-1/2 h-px w-3 -translate-x-1/2 -translate-y-1/2 bg-forest group-open:bg-cream" />
                      <span className="absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-forest group-open:bg-cream" />
                    </span>
                  </summary>
                  <div className="px-5 pb-6 md:px-6">
                    {needsSignOff ? (
                      <div data-needs-signoff="" className="rounded-lg bg-yellow-100 p-3 outline-2 outline-amber-600 outline-dashed">
                        <div className="tl-prose tl-prose--compact" dangerouslySetInnerHTML={{ __html: f.answerHtml }} />
                        <SignOffLabel />
                      </div>
                    ) : (
                      <div className="tl-prose tl-prose--compact" dangerouslySetInnerHTML={{ __html: f.answerHtml }} />
                    )}
                  </div>
                </details>
              )
            })}
          </div>
          <p className="mt-6 text-center font-body text-base text-charcoal/80">
            Another question?{' '}
            <LandingWhatsAppLink location="fab" trackAs="faq" className={TEXT_LINK}>
              Ask us on WhatsApp
            </LandingWhatsAppLink>
          </p>
        </div>
      </div>
    </section>
  )
}
