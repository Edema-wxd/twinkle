import Image from 'next/image'
import { BUSINESS } from '@/lib/config/business'
import type { LandingConfig } from '@/lib/landing/config'
import { canOptimise } from '@/lib/landing/images'
import type { LandingReviews } from '@/lib/landing/reviews'
import { cleanProductName } from '@/lib/landing/selection'
import { StarRating } from '@/components/product/StarRating'
import { Carousel } from './Carousel'
import { DisplayText } from './Copy'
import { InstagramIcon } from './icons'
import { CONTAINER, H2, H3, REVEAL, SECTION_Y, TEXT_LINK } from './ui'

/** The Instagram grid needs at least this many saved posts */
export const MIN_INSTAGRAM_POSTS = 4

type Props = {
  data: LandingReviews
  instagram: LandingConfig['instagram']
  /** Slugs with a card on this page: review tags jump to the card instead of leaving */
  featuredSlugs: string[]
}

/**
 * Real customers only: photo reviews with written permission, newest first. Hidden
 * entirely (no empty state) under the admin's threshold, unless there are enough
 * tagged Instagram posts to show on their own.
 */
export function Reviews({ data, instagram, featuredSlugs }: Props) {
  const showGrid = instagram.length >= MIN_INSTAGRAM_POSTS
  if (!data.showCarousel && !showGrid) return null

  return (
    <section aria-labelledby="reviews-title" data-reveal className={`overflow-hidden bg-cream ${SECTION_Y} ${REVEAL}`}>
      <div className={CONTAINER}>
        <h2 id="reviews-title" className={H2}>
          <DisplayText text="Worn by the Twinkle family" />
        </h2>
        {data.showRating && (
          <p className="mt-3 inline-flex items-center gap-2 font-body text-base font-medium text-charcoal/80">
            <StarRating value={data.totals.average} className="text-lg" />
            <span>
              {data.totals.average.toFixed(1)} from {data.totals.count.toLocaleString('en-NG')} reviews
            </span>
          </p>
        )}

        {data.showCarousel && (
          <div className="mt-8 md:mt-10">
            <Carousel
              label="Customer reviews"
              noun="review"
              controls="below"
              bleed
              gapClassName="gap-4 lg:gap-6"
              slideClassName="w-[85%] sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-3rem)/3)]"
            >
              {data.reviews.map((r) => {
                const product = cleanProductName(r.productName)
                const href = featuredSlugs.includes(r.productSlug) ? `#product-${r.productSlug}` : r.productActive ? `/catalog/${r.productSlug}` : null
                return (
                  <figure key={r.id} className="flex h-full flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-forest/10">
                    <div className="relative aspect-square bg-stone">
                      <Image
                        src={r.photoUrl}
                        alt={`${r.firstName}'s locs with ${product}`}
                        fill
                        sizes="(min-width: 1024px) 336px, (min-width: 640px) 50vw, 85vw"
                        unoptimized={!canOptimise(r.photoUrl)}
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <StarRating value={r.rating} className="text-base" />
                      <blockquote className="mt-3 line-clamp-3 font-body text-base leading-normal text-charcoal">
                        <p>&ldquo;{r.body}&rdquo;</p>
                      </blockquote>
                      <figcaption className="mt-auto flex flex-wrap items-center justify-between gap-x-3 pt-3">
                        <span className="font-heading text-sm font-semibold text-forest">
                          {r.firstName}
                          {r.city ? `, ${r.city}` : ''}
                        </span>
                        {href ? (
                          <a href={href} className="group inline-flex min-h-11 items-center focus-visible:outline-none">
                            <span className="rounded-full bg-forest/[0.06] px-3 py-1 font-body text-[13px] font-semibold text-forest ring-1 ring-forest/15 transition-colors group-hover:bg-forest/10 group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-forest">
                              {product}
                            </span>
                          </a>
                        ) : (
                          <span className="rounded-full bg-forest/[0.06] px-3 py-1 font-body text-[13px] font-semibold text-forest">{product}</span>
                        )}
                      </figcaption>
                    </div>
                  </figure>
                )
              })}
            </Carousel>
          </div>
        )}

        {showGrid && (
          <div className={data.showCarousel ? 'mt-12 md:mt-16' : 'mt-8 md:mt-10'}>
            <h3 className={`${H3} flex items-center gap-2`}>
              <InstagramIcon className="h-5 w-5" />
              Tagged{' '}
              <a href={BUSINESS.instagram.url} target="_blank" rel="noopener noreferrer" className={TEXT_LINK}>
                @{BUSINESS.instagram.handle}
              </a>
            </h3>
            <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3">
              {instagram.map((post, i) => {
                const img = (
                  <Image
                    src={post.url}
                    alt={post.alt || `Customer photo tagged @${BUSINESS.instagram.handle}`}
                    fill
                    sizes="(min-width: 1120px) 352px, (min-width: 640px) 33vw, 50vw"
                    unoptimized={!canOptimise(post.url)}
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                )
                return (
                  <li key={post.url + i} className="relative aspect-square overflow-hidden rounded-2xl bg-stone">
                    {post.postUrl ? (
                      <a href={post.postUrl} target="_blank" rel="noopener noreferrer" className="group absolute inset-0 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-cream">
                        {img}
                        <span className="sr-only"> (opens the post on Instagram)</span>
                      </a>
                    ) : (
                      img
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
