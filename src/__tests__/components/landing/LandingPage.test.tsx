import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToString } from 'react-dom/server'

// The whole page against a real database (PGlite), rendered to HTML like the first response ("view source")
vi.mock('@/db', () => import('../../helpers/pgliteDb'))
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt, priority }: { src: string; alt: string; priority?: boolean }) => <img src={src} alt={alt} data-priority={priority ? '' : undefined} />,
  getImageProps: ({ src }: { src: string }) => ({ props: { src: `/_next/image?url=${encodeURIComponent(src)}&w=1080&q=75` } }),
}))

import { db, resetDb, products, reviews } from '../../helpers/pgliteDb'
import { CartProvider } from '@/lib/cart/CartContext'
import { saveLandingConfig } from '@/lib/landing/config.server'
import { parseLandingConfig } from '@/lib/landing/config'
import { LandingPage } from '@/components/landing/LandingPage'
import { landingMetadata } from '@/lib/landing/metadata'

async function page(heroKey: string | null = null) {
  return renderToString(<CartProvider>{await LandingPage({ heroKey })}</CartProvider>)
}

let goldId = ''
beforeEach(async () => {
  await resetDb()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const [p] = await db
    .insert(products)
    .values({
      slug: 'gold-twinkles',
      name: 'Gold Twinkles ✨',
      material: 'Gold',
      priceMin: 13590,
      priceMax: 24451,
      image: 'https://ta1u3ge9om.ufs.sh/f/gold',
      variants: [
        {
          id: 'v4',
          name: '4mm',
          price: 13590,
          in_stock: true,
          price_tiers: [
            { qty: 50, price: 13590 },
            { qty: 100, price: 18903 },
          ],
        },
      ],
    })
    .returning({ id: products.id })
  goldId = p.id
  await saveLandingConfig(
    parseLandingConfig({
      featured: [{ slug: 'gold-twinkles', tagline: 'Warm gold [confirm]', fallback: { size: '4mm', pack: 100, thread: 'blonde' } }],
      hero: {
        headline: 'Loc beads that catch the light.',
        variants: [{ key: 'gold-video', label: 'Gold video', headline: 'Gold that moves with you.' }],
      },
    }),
  )
})

describe('/shop-twinkles', () => {
  it('has the real price of the preselected options in the first HTML, one H1, and every section in order', async () => {
    const html = await page()
    expect(html).toContain('₦18,903')
    expect(html).toContain('pack of 100')
    expect(html.match(/<h1/g)).toHaveLength(1)
    const order = ['id="lp-hero"', 'id="best-sellers"', 'id="how-title"', 'id="delivery-title"', 'id="faq-title"', 'id="final-cta"']
    const positions = order.map((s) => html.indexOf(s))
    expect(positions.every((p) => p >= 0)).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
  })

  it('marks copy that still needs sign-off, and missing photos', async () => {
    const html = await page()
    expect(html).toContain('Needs sign-off') // the "[confirm]" tagline
    expect(html).toMatch(/Photo needed: (<!-- -->)?hero lifestyle photo/) // no hero photo yet: the product photo stands in
    expect(html).toContain('data-priority') // the hero image is the priority (LCP) image
  })

  it('emits Product JSON-LD with the preselected price in NGN, and FAQPage', async () => {
    const html = await page()
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]))
    const product = blocks.find((b) => b['@type'] === 'Product')
    expect(product).toMatchObject({ name: 'Gold Twinkles', offers: { '@type': 'Offer', price: 18903, priceCurrency: 'NGN', availability: 'https://schema.org/InStock' } })
    expect(product.aggregateRating).toBeUndefined() // no reviews yet
    expect(blocks.some((b) => b['@type'] === 'FAQPage')).toBe(true)
  })

  it('hides the reviews section until there are enough photo reviews with permission', async () => {
    expect(await page()).not.toContain('Worn by the Twinkle family')
    for (let i = 0; i < 3; i++) {
      await db.insert(reviews).values({ productId: goldId, authorName: `Ada ${i}`, body: 'Love them', rating: 5, photoUrl: `https://ta1u3ge9om.ufs.sh/f/r${i}`, photoPermission: true, city: 'Lagos' })
    }
    const html = await page()
    expect(html).toContain('Worn by the Twinkle family')
    expect(html).toContain('href="#product-gold-twinkles"') // the tag jumps to the card
    expect(html).not.toContain('from 3 reviews') // rating line needs 10
  })

  it('shows a hero version by its key, and the main hero for unknown keys', async () => {
    // (the full stop is its own span: Halimun has no punctuation, so it's set in Mistrully)
    expect(await page('gold-video')).toContain('Gold that moves with you')
    const unknown = await page('nope')
    expect(unknown).toContain('Loc beads that catch the light')
    expect(unknown).not.toContain('Gold that moves with you')
  })

  it('is noindex with a canonical of /shop-twinkles for every hero version', async () => {
    const meta = await landingMetadata('gold-video')
    expect(meta.robots).toEqual({ index: false, follow: true })
    expect(meta.alternates?.canonical).toBe('/shop-twinkles')
    expect(meta.title).toEqual({ absolute: 'Twinkle Locs | Handcrafted Loc Beads, Delivered Across Nigeria' })
  })
})
