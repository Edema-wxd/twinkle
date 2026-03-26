import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { FaqAccordion } from '@/components/faq/FaqAccordion'

export const metadata: Metadata = {
  title: 'FAQs — Twinkle Locs',
  description: 'Answers to common questions about our loc beads, shipping, care, and orders.',
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
