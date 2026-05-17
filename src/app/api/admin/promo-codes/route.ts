import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/server'
import { db } from '@/db'
import { promoCodes } from '@/db'
import { eq } from 'drizzle-orm'

async function requireAdmin() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return null
}

export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied

  const codes = await db
    .select()
    .from(promoCodes)
    .orderBy(promoCodes.createdAt)

  return NextResponse.json({ codes })
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    code,
    discountType,
    discountValue,
    maxUses,
    expiresAt,
    isActive,
  } = body as Record<string, unknown>

  if (!code || typeof code !== 'string' || code.trim() === '') {
    return NextResponse.json({ error: 'Code is required' }, { status: 400 })
  }

  const validTypes = ['free_shipping', 'percentage', 'fixed']
  if (!discountType || !validTypes.includes(discountType as string)) {
    return NextResponse.json({ error: 'Invalid discount type' }, { status: 400 })
  }

  const value = typeof discountValue === 'number' ? discountValue : Number(discountValue ?? 0)
  if (isNaN(value) || value < 0) {
    return NextResponse.json({ error: 'Invalid discount value' }, { status: 400 })
  }

  try {
    const [created] = await db
      .insert(promoCodes)
      .values({
        code: (code as string).toUpperCase().trim(),
        discountType: discountType as string,
        discountValue: value,
        maxUses: maxUses != null ? Number(maxUses) : null,
        expiresAt: expiresAt ? new Date(expiresAt as string) : null,
        isActive: isActive !== false,
      })
      .returning()

    return NextResponse.json({ code: created }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('unique')) {
      return NextResponse.json({ error: 'A promo code with that name already exists' }, { status: 409 })
    }
    console.error('[admin/promo-codes] POST failed:', err)
    return NextResponse.json({ error: 'Failed to create promo code' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { id, ...fields } = body as Record<string, unknown>
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const patch: Record<string, unknown> = {}
  if ('isActive' in fields) patch.isActive = Boolean(fields.isActive)
  if ('code' in fields && typeof fields.code === 'string') patch.code = fields.code.toUpperCase().trim()
  if ('discountType' in fields) patch.discountType = fields.discountType
  if ('discountValue' in fields) patch.discountValue = Number(fields.discountValue)
  if ('maxUses' in fields) patch.maxUses = fields.maxUses != null ? Number(fields.maxUses) : null
  if ('expiresAt' in fields) patch.expiresAt = fields.expiresAt ? new Date(fields.expiresAt as string) : null

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  try {
    const [updated] = await db
      .update(promoCodes)
      .set(patch)
      .where(eq(promoCodes.id, id))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Promo code not found' }, { status: 404 })
    }
    return NextResponse.json({ code: updated })
  } catch (err) {
    console.error('[admin/promo-codes] PUT failed:', err)
    return NextResponse.json({ error: 'Failed to update promo code' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id query param is required' }, { status: 400 })
  }

  const [deleted] = await db
    .delete(promoCodes)
    .where(eq(promoCodes.id, id))
    .returning({ id: promoCodes.id })

  if (!deleted) {
    return NextResponse.json({ error: 'Promo code not found' }, { status: 404 })
  }

  return NextResponse.json({ deleted: deleted.id })
}
