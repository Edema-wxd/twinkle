import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/server'
import { db } from '@/db'
import { emailTemplates } from '@/db'

import { DEFAULT_ORDER_TEMPLATES } from '@/lib/email/orderTemplate'

const DEFAULT_TEMPLATES = Object.entries(DEFAULT_ORDER_TEMPLATES).map(([key, t]) => ({ key, ...t }))

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let rows = await db.select().from(emailTemplates)

  if (rows.length === 0) {
    await db
      .insert(emailTemplates)
      .values(DEFAULT_TEMPLATES)
      .onConflictDoNothing()
    rows = await db.select().from(emailTemplates)
  }

  // Return in canonical order
  const order = ['confirmed', 'processing', 'shipped', 'delivered', 'review_reminder']
  const sorted = [...rows].sort(
    (a, b) => order.indexOf(a.key) - order.indexOf(b.key)
  )

  return NextResponse.json({ templates: sorted })
}
