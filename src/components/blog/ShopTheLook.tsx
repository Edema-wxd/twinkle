import Image from 'next/image'
import Link from 'next/link'

export type LookProduct = {
  id: string
  name: string
  slug: string
  image: string
  price_min: number
  material: string
}

/** Product strip at the end of a blog post: turns readers into shoppers. */
export function ShopTheLook({ products }: { products: LookProduct[] }) {
  if (products.length === 0) return null

  return (
    <section aria-labelledby="shop-the-look" className="rounded-3xl bg-stone px-5 py-10 md:px-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-heading text-xs font-semibold uppercase tracking-[0.2em] text-gold-deep">Featured in this story</p>
          <h2 id="shop-the-look" className="mt-2 font-display text-4xl text-forest">Shop the look</h2>
        </div>
        <Link href="/catalog" className="font-heading text-sm font-semibold text-forest underline decoration-gold decoration-2 underline-offset-4 hover:text-gold-deep">
          See the full collection
        </Link>
      </div>
      <ul className={`grid gap-4 ${products.length === 1 ? 'grid-cols-1 sm:max-w-xs' : 'grid-cols-2'} ${products.length > 2 ? 'md:grid-cols-4' : ''}`}>
        {products.map((p) => (
          <li key={p.id} className="group relative overflow-hidden rounded-2xl bg-white ring-1 ring-forest/5 transition-shadow hover:shadow-lg">
            <div className="relative aspect-square overflow-hidden">
              <Image
                src={p.image}
                alt={p.name}
                fill
                sizes="(max-width: 768px) 50vw, 240px"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
            </div>
            <div className="p-3 md:p-4">
              <p className="font-body text-[11px] uppercase tracking-[0.12em] text-charcoal/60">{p.material}</p>
              <h3 className="mt-0.5 font-heading text-sm font-semibold text-forest leading-snug">
                <Link href={`/catalog/${p.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-gold focus-visible:after:rounded-2xl">
                  {p.name}
                </Link>
              </h3>
              <p className="mt-1 font-body text-sm text-charcoal/75">From &#8358;{p.price_min.toLocaleString()}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
