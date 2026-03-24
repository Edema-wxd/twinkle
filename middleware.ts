import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // ── Step 1: Lowercase URL redirect (SEO-04) ──────────────────────────────
  // Redirects any URL with uppercase letters to its lowercase equivalent.
  // Example: /Products → /products, /CATALOG/Gold-Beads → /catalog/gold-beads
  const { pathname, search, origin } = request.nextUrl
  if (pathname !== pathname.toLowerCase()) {
    return NextResponse.redirect(
      new URL(origin + pathname.toLowerCase() + search)
    )
  }

  // ── Step 2: Supabase session refresh ──────────────────────────────────────
  // Must run on every request (except static assets — see matcher below).
  // Creates a response object that middleware can attach cookies to.
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Write to the request (for downstream middleware/routes)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Re-create response to ensure cookies are written to it
          supabaseResponse = NextResponse.next({ request })
          // Write to the response (returned to the browser)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh the session. Must be called before any auth-dependent logic.
  // getClaims() validates the JWT signature (unlike getSession() which does not).
  await supabase.auth.getClaims()

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - Static file extensions (svg, png, jpg, etc.)
     */
    '/((?!api/webhooks|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
