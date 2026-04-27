import type { Metadata } from 'next'
import { db, faqs as faqsTable } from '@/db'
import { asc } from 'drizzle-orm'
import { FaqAccordion } from '@/components/faq/FaqAccordion'
import { Faq } from '@/types/supabase'

export const metadata: Metadata = {
  title: 'FAQs',
  description: 'Answers to common questions about Twinkle Locs loc beads — materials, sizing, shipping timelines, care instructions, and how to place an order.',
  openGraph: {
    title: 'FAQs | Twinkle Locs',
    description: 'Common questions about loc beads, sizing, shipping, and care.',
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
      .orderBy(asc(faqsTable.category), asc(faqsTable.displayOrder))
  } catch (err) {
    console.error('Failed to fetch faqs:', err)
  }

  // Map Drizzle camelCase to snake_case shape expected by FaqAccordion component
  const faqs: Faq[] = rows.map((r) => ({
    id: r.id,
    category: r.category,
    question: r.question,
    answer: r.answer,
    display_order: r.displayOrder,
    created_at: r.createdAt.toISOString(),
  }))

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <h1 className="font-heading text-4xl font-bold text-charcoal mb-3">
        Frequently Asked Questions
      </h1>
      <p className="text-charcoal/60 mb-12">
        Can&apos;t find your answer here? Reach us on WhatsApp and we&apos;ll be happy to help.
      </p>
      <FaqAccordion faqs={faqs} />
    </main>
  )
}
