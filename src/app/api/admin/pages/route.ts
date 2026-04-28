import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/server'
import { db } from '@/db'
import { aboutSections } from '@/db'
import { sql } from 'drizzle-orm'
import { deleteUploadthingFilesByUrls } from '@/lib/uploadthing/server'

interface SectionPayload {
  id: string
  title: string
  body: string
  image_url: string | null
  display_order?: number
}

export async function PUT(req: NextRequest) {
  // Auth check — validate against auth server (not just local JWT)
  const session = await getAdminSession()
  if (!session) {
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

  // Map to Insert shape — preserve display_order if provided, else omit (DB keeps existing value via upsert)
  const insertRows = rows.map((r, idx) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    imageUrl: r.image_url,
    displayOrder: r.display_order ?? idx,
  }))

  try {
    const existing = await db
      .select({ id: aboutSections.id, imageUrl: aboutSections.imageUrl })
      .from(aboutSections)

    await db.insert(aboutSections).values(insertRows).onConflictDoUpdate({
      target: aboutSections.id,
      set: {
        title: sql`excluded.title`,
        body: sql`excluded.body`,
        imageUrl: sql`excluded.image_url`,
        displayOrder: sql`excluded.display_order`,
      },
    })

    // Cleanup removed/replaced images (best-effort).
    const prevById = new Map(existing.map((r) => [r.id, r.imageUrl]))
    const removed: string[] = []
    for (const r of rows) {
      const prev = prevById.get(r.id) ?? null
      const next = r.image_url ?? null
      if (prev && prev !== next) removed.push(prev)
    }
    if (removed.length > 0) {
      try {
        await deleteUploadthingFilesByUrls(removed)
      } catch (err) {
        console.error('UploadThing cleanup failed (about sections):', err)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Failed to upsert about_sections:', err)
    return NextResponse.json({ error: 'Failed to save sections' }, { status: 500 })
  }
}
