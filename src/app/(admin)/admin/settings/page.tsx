import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SettingsForm } from '../../_components/SettingsForm'

export const metadata = {
  title: 'Settings — Twinkle Locs Admin',
}

export default async function AdminSettingsPage() {
  // Belt-and-braces auth check (CVE-2025-29927 — layout.tsx also checks)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const adminClient = createAdminClient()
  const { data: rows, error } = await adminClient
    .from('settings')
    .select('key, value')

  if (error) {
    console.error('Failed to fetch settings:', error)
  }

  const settings: Record<string, string> = Object.fromEntries(
    (rows ?? []).map((r) => [r.key, r.value])
  )

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Settings</h1>
        <p className="text-stone-400 text-sm mt-1">
          Business details and configuration. Changes take effect on the storefront at next page load — no redeploy needed.
        </p>
      </div>

      <SettingsForm settings={settings} />
    </div>
  )
}
