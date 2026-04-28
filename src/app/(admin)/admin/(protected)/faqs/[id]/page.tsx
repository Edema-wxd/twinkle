import { notFound } from 'next/navigation'
import { requireAdminSession } from '@/lib/auth/server'
import { db } from '@/db'
import { faqs } from '@/db'
import { eq } from 'drizzle-orm'
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

  const [row] = await db.select().from(faqs).where(eq(faqs.id, id)).limit(1)

  if (!row) {
    notFound()
  }

  // Map camelCase Drizzle row to snake_case shape expected by FaqForm
  const faq = {
    id: row.id,
    category: row.category,
    question: row.question,
    answer: row.answer,
    display_order: row.displayOrder,
    created_at: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Edit FAQ</h1>
        <p className="text-stone-400 text-sm mt-1 truncate">{faq.question}</p>
      </div>

      <div className="bg-stone-800/50 rounded-xl p-6 ring-1 ring-stone-700">
        <FaqForm faq={faq} />
      </div>
    </div>
  )
}
