import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/server'
import { db } from '@/db'
import { settings } from '@/db'
import { sql } from 'drizzle-orm'

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

  try {
    await db.insert(settings).values(rows).onConflictDoUpdate({
      target: settings.key,
      set: { value: sql`excluded.value` },
    })
    return NextResponse.json({ updated: rows.map((r) => r.key) })
  } catch (err) {
    console.error('Failed to upsert settings:', err)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
