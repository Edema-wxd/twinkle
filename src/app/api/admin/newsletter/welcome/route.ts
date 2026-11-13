import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/server'
import { getWelcomeSettings, saveWelcomeSettings } from '@/lib/newsletter/welcome'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await getWelcomeSettings())
}

/** Save the welcome email (and whether it's switched on). */
export async function PUT(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const result = await saveWelcomeSettings(await req.json().catch(() => null))
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json(result.settings)
  } catch (err) {
    console.error('[newsletter] saving welcome email failed:', err)
    return NextResponse.json({ error: 'Couldn’t save. Please try again.' }, { status: 500 })
  }
}
