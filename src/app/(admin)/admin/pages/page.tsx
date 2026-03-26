import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AboutPagesForm } from '../../_components/AboutPagesForm'
import { AboutSection } from '@/types/supabase'

export const metadata = {
  title: 'About Page — Twinkle Locs Admin',
}

const DEFAULT_SECTIONS: AboutSection[] = [
  {
    id: 'founder-story',
    title: 'Founder Story',
    body: '',
    image_url: null,
    display_order: 0,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'brand-mission',
    title: 'Brand Mission',
    body: '',
    image_url: null,
    display_order: 1,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'why-loc-beads',
    title: 'Why Loc Beads',
    body: '',
    image_url: null,
    display_order: 2,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'contact',
    title: 'Contact',
    body: '',
    image_url: null,
    display_order: 3,
    updated_at: new Date().toISOString(),
  },
]

export default async function AdminPagesPage() {
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
    .from('about_sections')
    .select('*')
    .order('display_order')

  if (error) {
    console.error('Failed to fetch about_sections:', error)
  }

  // If no rows exist (fresh install), use default placeholders
  const sections: AboutSection[] = rows && rows.length > 0 ? rows : DEFAULT_SECTIONS

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">About Page</h1>
        <p className="text-stone-400 text-sm mt-1">
          Edit the four sections that appear on the public /about page. Changes are live at next page load.
        </p>
      </div>

      <AboutPagesForm sections={sections} />
    </div>
  )
}
