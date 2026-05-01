import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/server'
import { db, testimonials } from '@/db'
import { asc } from 'drizzle-orm'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db.select().from(testimonials).orderBy(asc(testimonials.displayOrder))
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { name, quote, display_order } = body as { name?: unknown; quote?: unknown; display_order?: unknown }

  if (!name || typeof name !== 'string' || name.trim() === '')
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  if (!quote || typeof quote !== 'string' || quote.trim() === '')
    return NextResponse.json({ error: 'quote is required' }, { status: 400 })

  const [row] = await db.insert(testimonials).values({
    name: name.trim(),
    quote: quote.trim(),
    displayOrder: typeof display_order === 'number' ? display_order : 0,
  }).returning()

  return NextResponse.json(row, { status: 201 })
}
