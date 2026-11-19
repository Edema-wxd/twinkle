import { landingRedirect } from '@/lib/landing/redirect'

// Short ad link for a hero version: /lp/<key>?utm_... → /shop-twinkles/<key>?utm_... (308, query kept)
export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  return landingRedirect(request, key)
}
