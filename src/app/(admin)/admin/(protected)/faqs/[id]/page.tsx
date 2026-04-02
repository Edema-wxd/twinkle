import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const { id } = await params

  const adminClient = createAdminClient()
  const result = await adminClient
    .from('faqs')
    .select('*')
    .eq('id', id)
    .single()

  if (result.error || !result.data) {
    notFound()
  }

  const faq = result.data

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
