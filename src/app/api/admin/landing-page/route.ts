import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/server'
import { parseLandingConfig } from '@/lib/landing/config'
import { getLandingConfig, saveLandingConfig } from '@/lib/landing/config.server'
import { revalidateLandingPage } from '../_lib/revalidateLanding'

/**
 * Save Admin → Ad landing page. The body is the whole LandingConfig (the form
 * always sends every field). parseLandingConfig cleans it: unsafe links are
 * dropped and out-of-range numbers fall back to the defaults, so a bad value
 * can never break the live page. Returns the config as saved.
 */
export async function PUT(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  // A non-object would parse to the defaults and wipe everything Unoma has written
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Send the landing page settings as an object' }, { status: 400 })
  }

  try {
    await saveLandingConfig(parseLandingConfig(body))
  } catch (err) {
    console.error('[admin/landing-page] save failed:', err)
    return NextResponse.json({ error: 'Could not save the landing page. Please try again.' }, { status: 500 })
  }

  revalidateLandingPage()
  return NextResponse.json({ config: await getLandingConfig() })
}
