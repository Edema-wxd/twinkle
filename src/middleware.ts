import { NextRequest, NextResponse } from 'next/server'

const LOGIN_PATH = '/admin/login'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Only intercept admin routes (not the login page itself or API routes)
  if (
    !pathname.startsWith('/admin') ||
    pathname.startsWith(LOGIN_PATH) ||
    pathname.startsWith('/api/')
  ) {
    return NextResponse.next()
  }

  // Fast edge check: session cookie must exist.
  // Full validation (against the auth server) still happens per-page via
  // requireAdminSession() — this is just an early redirect to avoid
  // rendering protected layouts for unauthenticated requests (CVE-2025-29927).
  const sessionCookie =
    req.cookies.get('twinkle.session_token') ??
    req.cookies.get('better-auth.session_token')

  if (!sessionCookie?.value) {
    const url = req.nextUrl.clone()
    url.pathname = LOGIN_PATH
    // Preserve the intended destination so login can redirect back
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
