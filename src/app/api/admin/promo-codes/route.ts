import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/server'
import { db } from '@/db'
import { promoCodes } from '@/db'
import { eq } from 'drizzle-orm'
import { isUniqueViolation } from '@/lib/db/errors'
import { WELCOME_OFFER_SOURCE } from '@/lib/landing/welcomeOffer'
import { listAdminPromoCodes, listWelcomeCodes, parseMinOrder, welcomeCodeSummary } from '@/app/(admin)/_lib/promo-codes'

async function requireAdmin() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return null
}

/**
 * GET: the codes made in Admin, plus a count of the landing page's one-use
 * welcome codes (kept out of the list so they don't bury the real ones).
 * GET ?source=welcome: the welcome codes themselves, newest first, with the email each went to.
 */
export async function GET(req: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  if (req.nextUrl.searchParams.get('source') === WELCOME_OFFER_SOURCE) {
    const codes = await listWelcomeCodes()
    return NextResponse.json({ codes })
  }

  const [codes, welcome] = await Promise.all([listAdminPromoCodes(), welcomeCodeSummary()])
  return NextResponse.json({ codes, welcome })
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
    minOrder,
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

  const min = parseMinOrder(minOrder)
  if (min === undefined) {
    return NextResponse.json({ error: 'Minimum order must be a whole number of naira (0 or blank for none)' }, { status: 400 })
  }

  try {
    const [created] = await db
      .insert(promoCodes)
      .values({
        code: (code as string).toUpperCase().trim(),
        discountType: discountType as string,
        discountValue: value,
        maxUses: maxUses != null ? Number(maxUses) : null,
        minOrder: min,
        expiresAt: expiresAt ? new Date(expiresAt as string) : null,
        isActive: isActive !== false,
      })
      .returning()

    return NextResponse.json({ code: created }, { status: 201 })
  } catch (err: unknown) {
    if (isUniqueViolation(err)) {
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
  if ('minOrder' in fields) {
    const min = parseMinOrder(fields.minOrder)
    if (min === undefined) {
      return NextResponse.json({ error: 'Minimum order must be a whole number of naira (0 or blank for none)' }, { status: 400 })
    }
    patch.minOrder = min
  }
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
