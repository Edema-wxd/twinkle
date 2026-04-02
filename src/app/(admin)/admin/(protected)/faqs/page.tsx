import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { FaqForm } from '../../../_components/FaqForm'

export const metadata = {
  title: 'FAQs — Twinkle Locs Admin',
}

export default async function AdminFaqsPage() {
  // Belt-and-braces auth check (CVE-2025-29927 — layout.tsx also checks)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const adminClient = createAdminClient()
  const { data: faqs, error } = await adminClient
    .from('faqs')
    .select('*')
    .order('category')
    .order('display_order')

  if (error) {
    console.error('Failed to fetch FAQs:', error)
  }

  const faqList = faqs ?? []

  // Group by category for display
  const grouped = faqList.reduce<Record<string, typeof faqList>>(
    (acc, faq) => {
      acc[faq.category] ??= []
      acc[faq.category].push(faq)
      return acc
    },
    {}
  )

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-3xl">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">FAQs</h1>
        <p className="text-stone-400 text-sm mt-1">
          Manage frequently asked questions. Changes appear on the public /faq page immediately.
        </p>
      </div>

      {/* Add new FAQ */}
      <section className="bg-stone-800/50 rounded-xl p-6 ring-1 ring-stone-700">
        <h2 className="font-heading text-base font-semibold text-white mb-4">Add New FAQ</h2>
        <FaqForm />
      </section>

      {/* Existing FAQs */}
      {faqList.length === 0 ? (
        <p className="text-stone-500 text-sm">No FAQs yet. Add one above.</p>
      ) : (
        <section className="space-y-6">
          <h2 className="font-heading text-base font-semibold text-white">Existing FAQs</h2>
          {Object.entries(grouped).map(([categoryName, items]) => (
            <div key={categoryName} className="space-y-2">
              <h3 className="text-xs font-heading font-semibold text-stone-400 uppercase tracking-widest px-1">
                {categoryName}
              </h3>
              <div className="divide-y divide-stone-700 bg-stone-800/50 rounded-xl ring-1 ring-stone-700 overflow-hidden">
                {items.map((faq) => (
                  <div key={faq.id} className="flex items-center justify-between px-4 py-3 gap-4">
                    <span className="text-sm text-stone-200 flex-1 truncate">{faq.question}</span>
                    <Link
                      href={`/admin/faqs/${faq.id}`}
                      className="text-xs text-gold hover:text-gold/80 font-medium shrink-0 transition-colors"
                    >
                      Edit
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
