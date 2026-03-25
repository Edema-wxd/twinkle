import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

  // Only accept string values
  const rows: Array<{ key: string; value: string }> = []
  for (const [key, value] of Object.entries(pairs)) {
    if (typeof value !== 'string') {
      return NextResponse.json(
        { error: `Value for key "${key}" must be a string` },
        { status: 400 }
      )
    }
    rows.push({ key, value })
  }

  if (rows.length === 0) {
    return NextResponse.json({ updated: [] })
  }

  const adminClient = createAdminClient()

  const { error } = await adminClient
    .from('settings')
    .upsert(rows, { onConflict: 'key' })

  if (error) {
    console.error('Failed to upsert settings:', error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }

  return NextResponse.json({ updated: rows.map((r) => r.key) })
}
