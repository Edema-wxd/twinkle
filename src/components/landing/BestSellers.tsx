import Link from 'next/link'
import type { LandingProduct } from '@/lib/landing/data'
import { DisplayText } from './Copy'
import { ProductCard } from './ProductCard'
import { CONTAINER, EYEBROW, H2, LEAD, REVEAL, SECTION_Y, TEXT_LINK } from './ui'

type Props = {
  products: LandingProduct[]
  /** Active bead styles in the shop (null when it couldn't be counted) */
  styleCount: number | null
  stockWarningAt: number
}

/** Best-sellers: pick a bead and add it to cart without leaving the page */
export function BestSellers({ products, styleCount, stockWarningAt }: Props) {
  return (
    <section id="best-sellers" aria-labelledby="best-sellers-title" data-reveal className={`scroll-mt-14 bg-stone md:scroll-mt-16 ${SECTION_Y} ${REVEAL}`}>
      <div className={CONTAINER}>
        <div className="max-w-2xl">
          <p className={EYEBROW}>Best-sellers</p>
          <h2 id="best-sellers-title" className={`mt-4 ${H2}`}>
            <DisplayText text="Pick your Twinkles" />
          </h2>
          <p className={`mt-3 ${LEAD}`}>Choose a size, pack and thread colour. The price updates as you pick.</p>
        </div>

        {products.length > 0 ? (
          <div className="mx-auto mt-8 grid max-w-md gap-6 md:mt-12 lg:max-w-none lg:grid-cols-3 lg:gap-6">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={{
                  id: p.id,
                  slug: p.slug,
                  name: p.name,
                  cartName: p.cartName,
                  tagline: p.tagline,
                  material: p.material,
                  image: p.image,
                  images: p.images,
                  variants: p.variants,
                  price_min: p.price_min,
                }}
                initial={p.selection}
                stockWarningAt={stockWarningAt}
              />
            ))}
          </div>
        ) : (
          <p className="mt-8 rounded-2xl bg-white p-6 font-body text-base text-charcoal/80 ring-1 ring-forest/10">
            Our best-sellers are taking a moment to load. <Link href="/" className={TEXT_LINK}>Browse the whole shop</Link>.
          </p>
        )}

        <p className="mt-10 text-center">
          <Link href="/" className={`inline-flex min-h-11 items-center font-body text-base ${TEXT_LINK}`}>
            {styleCount ? `See all ${styleCount} styles` : 'See all styles'}
          </Link>
        </p>
      </div>
    </section>
  )
}
