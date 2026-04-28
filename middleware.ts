import { NextResponse, type NextRequest } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

export async function middleware(request: NextRequest) {
  // Step 1: Lowercase URL redirect (SEO-04) — preserved from Phase 1
  const { pathname, search, origin } = request.nextUrl
  if (pathname !== pathname.toLowerCase()) {
    return NextResponse.redirect(
      new URL(origin + pathname.toLowerCase() + search)
    )
  }

  // Step 2: Admin route cookie-presence guard (Edge-compatible)
  // Authoritative session validation happens in the protected layout +
  // every API route via auth.api.getSession() — middleware is fast filter only.
  const isAdminPath = pathname.startsWith('/admin')
  const isLoginPage = pathname === '/admin/login'
  const isSetupPage = pathname === '/admin/setup'

  const sessionCookie = getSessionCookie(request, {
    cookiePrefix: 'twinkle',
  })

  if (isAdminPath && !isLoginPage && !isSetupPage && !sessionCookie) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  if (isLoginPage && sessionCookie) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api/webhooks|api/auth|api/uploadthing|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
