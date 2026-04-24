

import type { MetadataRoute } from 'next'

const BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://twinklelocs.com').replace(/\/$/, '')

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/cart', '/orders/', '/api/'],
    },
    sitemap: `${BASE}/sitemap.xml`,
  }
}
