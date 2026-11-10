import { NextResponse, type NextRequest } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

// NOTE: this file must live at src/middleware.ts. With a `src/` layout Next.js
// ignores a middleware.ts at the repo root, which is why it never ran before.

/** Admin pages reachable without a session cookie. */
const PUBLIC_ADMIN_PATHS = new Set([
  '/admin/login',
  '/admin/finedining', // first-run setup (sign-up is refused once an admin exists)
])

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Step 1: Lowercase URL redirect (SEO-04).
  // Pages only: never files (public/ has /fonts/Halimun.ttf, /images/Logo.png)
  // and never API routes, whose case is meaningful to callers.
  const isApi = pathname.startsWith('/api/')
  const looksLikeFile = /\.[a-z0-9]+$/i.test(pathname)
  if (!isApi && !looksLikeFile && pathname !== pathname.toLowerCase()) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.toLowerCase()
    return NextResponse.redirect(url, 308)
  }

  // Step 2: Admin cookie-presence guard (Edge-compatible, fast filter only).
  // The authoritative check is requireAdminSession()/getAdminSession() in the
  // protected layout, every admin page and every API route.
  //
  // Deliberately NO "already logged in → leave /admin/login" redirect here: a
  // stale or no-longer-allowed cookie would bounce between /admin/login and
  // the layout's redirect forever.
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (!PUBLIC_ADMIN_PATHS.has(pathname)) {
      const sessionCookie = getSessionCookie(request, { cookiePrefix: 'twinkle' })
      if (!sessionCookie) {
        const login = new URL('/admin/login', request.url)
        if (pathname !== '/admin') login.searchParams.set('next', pathname)
        return NextResponse.redirect(login)
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api/webhooks|api/auth|api/uploadthing|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|ttf|woff2?|txt|xml|webmanifest)$).*)',
  ],
}
