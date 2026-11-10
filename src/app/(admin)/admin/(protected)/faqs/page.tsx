import { requireAdminSession } from '@/lib/auth/server'
import { db } from '@/db'
import { faqs } from '@/db'
import { asc } from 'drizzle-orm'
import { toFaqDto } from '@/lib/content'
import type { Faq } from '@/types/db'
import { FaqForm } from '../../../_components/FaqForm'
import { FaqManager } from '../../../_components/FaqManager'

export const metadata = {
  title: 'FAQs — Twinkle Locs Admin',
}

export default async function AdminFaqsPage() {
  // Belt-and-braces auth check (CVE-2025-29927 — layout.tsx also checks)
  await requireAdminSession()

  let faqList: Faq[] = []
  let loadError = false
  try {
    const rows = await db.select().from(faqs).orderBy(asc(faqs.category), asc(faqs.displayOrder), asc(faqs.createdAt))
    faqList = rows.map(toFaqDto)
  } catch (error) {
    loadError = true
    console.error('Failed to fetch FAQs:', error)
  }

  const categories = [...new Set(faqList.map((f) => f.category))]

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-4xl">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">FAQs</h1>
        <p className="text-stone-400 text-sm mt-1">
          Answer the questions customers ask on WhatsApp once, here. They show on /faq, in Google results, and (if starred) on the home page.
        </p>
      </div>

      {loadError && (
        <p role="alert" className="rounded-lg bg-red-950/60 ring-1 ring-red-800 px-4 py-3 text-sm text-red-200">
          Couldn&apos;t load FAQs. If you just deployed, run <code className="font-mono">npx drizzle-kit push</code> to add the new FAQ column.
        </p>
      )}

      <details className="group bg-stone-800/50 rounded-xl ring-1 ring-stone-700" open={faqList.length === 0}>
        <summary className="flex items-center justify-between cursor-pointer list-none px-6 py-4 font-heading text-base font-semibold text-white">
          Add a question
          <span className="text-gold-light text-xl leading-none transition-transform group-open:rotate-45" aria-hidden="true">+</span>
        </summary>
        <div className="px-6 pb-6">
          <FaqForm categories={categories} />
        </div>
      </details>

      <FaqManager faqs={faqList} />
    </div>
  )
}
