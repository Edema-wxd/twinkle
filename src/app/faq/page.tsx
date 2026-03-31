import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { FaqAccordion } from '@/components/faq/FaqAccordion'

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
  const supabase = await createClient()
  const { data: faqs } = await supabase
    .from('faqs')
    .select('*')
    .order('category')
    .order('display_order')

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-heading text-4xl font-bold text-charcoal mb-3">
        Frequently Asked Questions
      </h1>
      <p className="text-charcoal/60 mb-12">
        Can&apos;t find your answer here? Reach us on WhatsApp and we&apos;ll be happy to help.
      </p>
      <FaqAccordion faqs={faqs ?? []} />
    </main>
  )
}
