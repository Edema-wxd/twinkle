import type { Metadata } from 'next'
import Link from 'next/link'
import { db, faqs as faqsTable } from '@/db'
import { asc } from 'drizzle-orm'
import { FaqAccordion, type FaqItem } from '@/components/faq/FaqAccordion'
import { BUSINESS } from '@/lib/config/business'
import { faqAnswerHtml, htmlToText } from '@/lib/content'

export const metadata: Metadata = {
  title: { absolute: 'Loc Bead FAQs - Sizes, Care & How to Apply | Twinkle Locs' },
  description: 'Answers about Twinkle Locs beads: what sizes fit your locs, how to apply them, care instructions, shipping times across Nigeria, and how to order.',
  alternates: { canonical: '/faq' },
  openGraph: {
    title: 'Loc Bead FAQs - Sizes, Care & How to Apply | Twinkle Locs',
    description: 'Answers about Twinkle Locs beads: what sizes fit your locs, how to apply them, care instructions, shipping times across Nigeria, and how to order.',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
    type: 'website',
  },
}

export default async function FaqPage() {
  let rows: typeof faqsTable.$inferSelect[] = []
  try {
    rows = await db
      .select()
      .from(faqsTable)
      .orderBy(asc(faqsTable.category), asc(faqsTable.displayOrder), asc(faqsTable.createdAt))
  } catch (err) {
    console.error('Failed to fetch faqs:', err)
  }

  const faqs: FaqItem[] = rows.map((r) => {
    const answerHtml = faqAnswerHtml(r.answer)
    return { id: r.id, category: r.category, question: r.question, answerHtml, answerText: htmlToText(answerHtml) }
  })

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answerText },
    })),
  }

  return (
    <div className="bg-cream">
      {faqs.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }} />
      )}

      <header className="relative overflow-hidden bg-forest">
        <div aria-hidden="true" className="absolute inset-0 bg-pattern-02 opacity-[0.06]" />
        <div className="relative mx-auto max-w-3xl px-4 pt-14 pb-14 md:pt-20 md:pb-20">
          <p className="font-heading text-xs font-semibold uppercase tracking-[0.24em] text-gold-light">Help centre</p>
          <h1 className="mt-8 font-display text-5xl leading-[1.2] text-cream md:mt-10 md:text-7xl">Good to know</h1>
          <p className="mt-5 max-w-xl font-body text-base leading-relaxed text-cream/80 md:text-lg">
            Sizes, care, delivery and everything in between. Can&apos;t see your question? We&apos;re one WhatsApp away.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <FaqAccordion faqs={faqs} />

        <aside className="mt-16 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-forest p-6 text-cream">
            <p className="font-display text-3xl text-gold-light">Still wondering?</p>
            <p className="mt-2 font-body text-sm text-cream/80">Send a photo of your locs and we&apos;ll match you to the right bead size.</p>
            <a
              href={BUSINESS.whatsapp.url('Hi Twinkle Locs, I have a question about your beads')}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex min-h-11 items-center rounded-full bg-gold-light px-5 font-heading text-sm font-semibold text-forest transition-colors hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream focus-visible:ring-offset-2 focus-visible:ring-offset-forest"
            >
              Chat on WhatsApp
            </a>
          </div>
          <div className="rounded-2xl bg-white p-6 ring-1 ring-forest/10">
            <p className="font-display text-3xl text-forest">Learn the basics</p>
            <p className="mt-2 font-body text-sm text-charcoal/75">Step-by-step guides on applying, styling and caring for loc beads.</p>
            <Link
              href="/blog"
              className="mt-5 inline-flex min-h-11 items-center rounded-full ring-1 ring-forest/25 px-5 font-heading text-sm font-semibold text-forest transition-colors hover:bg-forest hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              Read the journal
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
