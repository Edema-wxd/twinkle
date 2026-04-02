import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '../../_components/AdminSidebar'

// Per-page auth check — middleware alone is not sufficient (CVE-2025-29927).
// getUser() validates against the auth server, not just the local JWT.
export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  return (
    <div className="flex min-h-screen bg-stone-950">
      <AdminSidebar />

      {/* Main content area */}
      {/* Mobile: add top padding for the fixed mobile header bar */}
      <main className="flex-1 pt-14 lg:pt-0 overflow-auto">
        {children}
      </main>
    </div>
  )
}
