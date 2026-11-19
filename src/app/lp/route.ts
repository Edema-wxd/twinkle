import { landingRedirect } from '@/lib/landing/redirect'

// Short ad link: /lp?utm_source=... → /shop-twinkles?utm_source=... (308, query kept)
export function GET(request: Request) {
  return landingRedirect(request)
}
