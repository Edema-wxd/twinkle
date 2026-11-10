import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdminSession } from '@/lib/auth/server'
import { db } from '@/db'
import { faqs } from '@/db'
import { eq } from 'drizzle-orm'
import { toFaqDto } from '@/lib/content'
import { FaqForm } from '../../../../_components/FaqForm'

export const metadata = {
  title: 'Edit FAQ — Twinkle Locs Admin',
}

export default async function EditFaqPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // Belt-and-braces auth check (CVE-2025-29927 — layout.tsx also checks)
  await requireAdminSession()

  const { id } = await params

  const [[row], categoryRows] = await Promise.all([
    db.select().from(faqs).where(eq(faqs.id, id)).limit(1),
    db.selectDistinct({ category: faqs.category }).from(faqs),
  ])

  if (!row) {
    notFound()
  }

  const faq = toFaqDto(row)

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-3xl">
      <div>
        <Link href="/admin/faqs" className="text-sm text-stone-400 hover:text-white transition-colors">&larr; All FAQs</Link>
        <h1 className="mt-3 font-heading text-2xl font-bold text-white">Edit FAQ</h1>
        <p className="text-stone-400 text-sm mt-1 truncate">{faq.question}</p>
      </div>

      <div className="bg-stone-800/50 rounded-xl p-6 ring-1 ring-stone-700">
        <FaqForm faq={faq} categories={categoryRows.map((c) => c.category).sort()} />
      </div>
    </div>
  )
}
