import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface SectionPayload {
  id: string
  title: string
  body: string
  image_url: string | null
  display_order?: number
}

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
    return NextResponse.json({ error: 'Body must be an object' }, { status: 400 })
  }

  const { sections } = body as { sections?: unknown }

  if (!Array.isArray(sections)) {
    return NextResponse.json({ error: 'sections must be an array' }, { status: 400 })
  }

  const rows: SectionPayload[] = []
  for (const section of sections) {
    if (
      !section ||
      typeof section !== 'object' ||
      typeof (section as Record<string, unknown>).id !== 'string' ||
      typeof (section as Record<string, unknown>).title !== 'string' ||
      typeof (section as Record<string, unknown>).body !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Each section must have id (string), title (string), body (string)' },
        { status: 400 }
      )
    }

    const s = section as Record<string, unknown>
    rows.push({
      id: s.id as string,
      title: s.title as string,
      body: s.body as string,
      image_url: (s.image_url as string | null) ?? null,
    })
  }

  const adminClient = createAdminClient()

  // Map to Insert shape — preserve display_order if provided, else omit (DB keeps existing value via upsert)
  const insertRows = rows.map((r, idx) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    image_url: r.image_url,
    display_order: r.display_order ?? idx,
  }))

  const { error } = await adminClient
    .from('about_sections')
    .upsert(insertRows, { onConflict: 'id' })

  if (error) {
    console.error('Failed to upsert about_sections:', error)
    return NextResponse.json({ error: 'Failed to save sections' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
