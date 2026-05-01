import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/server'
import { db, testimonials } from '@/db'
import { eq } from 'drizzle-orm'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { name, quote, display_order, is_active } = body as {
    name?: unknown; quote?: unknown; display_order?: unknown; is_active?: unknown
  }

  if (!name || typeof name !== 'string' || name.trim() === '')
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  if (!quote || typeof quote !== 'string' || quote.trim() === '')
    return NextResponse.json({ error: 'quote is required' }, { status: 400 })

  const [row] = await db.update(testimonials)
    .set({
      name: name.trim(),
      quote: quote.trim(),
      displayOrder: typeof display_order === 'number' ? display_order : 0,
      isActive: typeof is_active === 'boolean' ? is_active : true,
    })
    .where(eq(testimonials.id, id))
    .returning()

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await db.delete(testimonials).where(eq(testimonials.id, id))
  return NextResponse.json({ success: true })
}
