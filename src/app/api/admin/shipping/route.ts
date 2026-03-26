import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_SHIPPING_KEYS = [
  'shipping_lagos_rate',
  'shipping_other_rate',
  'shipping_lagos_days',
  'shipping_other_days',
  'shipping_intl_message',
  'shipping_page_intro',
] as const

export async function PUT(req: NextRequest) {
  // Auth check — validate against auth server (not just local JWT)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json(
      { error: 'Body must be a key-value object' },
      { status: 400 }
    )
  }

  const pairs = body as Record<string, unknown>

  // Allowlist — only accept the six known shipping keys
  const rows: Array<{ key: string; value: string }> = []
  for (const key of ALLOWED_SHIPPING_KEYS) {
    if (key in pairs) {
      const value = pairs[key]
      if (typeof value !== 'string') {
        return NextResponse.json(
          { error: `Value for key "${key}" must be a string` },
          { status: 400 }
        )
      }
      rows.push({ key, value })
    }
  }

  if (rows.length === 0) {
    return NextResponse.json({ updated: [] })
  }

  const adminClient = createAdminClient()

  const { error } = await adminClient
    .from('settings')
    .upsert(rows, { onConflict: 'key' })

  if (error) {
    console.error('Failed to upsert shipping settings:', error)
    return NextResponse.json({ error: 'Failed to save shipping settings' }, { status: 500 })
  }

  return NextResponse.json({ updated: rows.map((r) => r.key) })
}
