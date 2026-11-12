import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, newsletterSubscribers } from '@/db'
import { verifyUnsubscribeToken } from '@/lib/newsletter/unsubscribe'

/**
 * POST: unsubscribe (the /unsubscribe page's button, and Gmail/Yahoo one-click,
 * which POST "List-Unsubscribe=One-Click" to the URL from the email header).
 * GET only redirects to the confirmation page, because email security scanners
 * open every link in an email and must not unsubscribe people by doing so.
 */
async function params(req: NextRequest): Promise<{ email: string; token: string }> {
  const url = new URL(req.url)
  let email = url.searchParams.get('e') ?? ''
  let token = url.searchParams.get('t') ?? ''
  if (!email || !token) {
    const type = req.headers.get('content-type') ?? ''
    try {
      if (type.includes('application/json')) {
        const body = (await req.json()) as { e?: unknown; t?: unknown }
        email = typeof body.e === 'string' ? body.e : ''
        token = typeof body.t === 'string' ? body.t : ''
      } else {
        const form = await req.formData()
        email = String(form.get('e') ?? '')
        token = String(form.get('t') ?? '')
      }
    } catch {
      // empty or unreadable body: falls through to "invalid link"
    }
  }
  return { email: email.trim().toLowerCase(), token: token.trim() }
}

export async function POST(req: NextRequest) {
  const { email, token } = await params(req)
  if (!verifyUnsubscribeToken(email, token)) {
    return NextResponse.json({ error: 'This unsubscribe link isn’t valid. Message us and we’ll remove you.' }, { status: 400 })
  }
  try {
    // Deleting (not flagging) keeps nothing we no longer need; it's idempotent too
    await db.delete(newsletterSubscribers).where(eq(newsletterSubscribers.email, email))
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[newsletter] unsubscribe failed:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again, or message us.' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const to = new URL('/unsubscribe', url.origin)
  to.search = url.search
  return NextResponse.redirect(to, 303)
}
