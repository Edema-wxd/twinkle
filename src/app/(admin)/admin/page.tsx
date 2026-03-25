import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Belt-and-braces auth check — layout.tsx also checks, but individual pages
// should never trust the layout alone (CVE-2025-29927).
export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  return (
    <div className="p-6 lg:p-8">
      <h1 className="font-heading text-2xl font-bold text-charcoal mb-2">
        Dashboard
      </h1>
      <p className="text-stone-500 text-sm">Loading dashboard…</p>
      {/* Plan 06-02 will replace this stub with real stats */}
    </div>
  )
}
