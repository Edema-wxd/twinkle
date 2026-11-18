import Image, { getImageProps } from 'next/image'
import type { ResolvedHero } from '@/lib/landing/config'
import { canOptimise } from '@/lib/landing/images'
import type { RatingTotals } from '@/lib/landing/reviews'
import { StarRating } from '@/components/product/StarRating'
import { Copy, PhotoNeeded, PhotoNeededBadge } from './Copy'
import { HeroVideo } from './HeroVideo'
import { LandingWhatsAppLink } from './LandingWhatsAppLink'
import { LockIcon, TruckIcon, WhatsAppIcon } from './icons'
import { BTN_PRIMARY } from './ui'

const SIZES = '(min-width: 1120px) 504px, (min-width: 768px) 50vw, 100vw'

type Props = {
  /** Main hero or a variant (resolveHero), so every version renders the same way */
  hero: ResolvedHero
  /** Product photo shown, marked "Photo needed", until the lifestyle photo is uploaded */
  standInImage: string | null
  /** Real average and count; null hides the rating item (under the admin's threshold) */
  rating: RatingTotals | null
}

/**
 * Hero: the product on real locs and the first tap within 5 seconds.
 * Phones: full-bleed 4:5 photo, about 70% of the screen, headline and button over a
 * dark gradient. Desktop: 50/50, text left, photo right.
 */
export function Hero({ hero, standInImage, rating }: Props) {
  const photo = hero.image ?? (standInImage ? { url: standInImage, alt: 'Twinkles loc beads' } : null)
  const optimise = photo ? canOptimise(photo.url) : true
  const poster =
    photo && hero.videoUrl
      ? optimise
        ? getImageProps({ src: photo.url, alt: '', width: 540, height: 675 }).props.src
        : photo.url
      : null

  return (
    <section id="lp-hero" aria-labelledby="lp-hero-title" className="bg-cream">
      <div className="mx-auto grid w-full max-w-[1120px] grid-cols-1 md:grid-cols-2 md:grid-rows-[1fr_auto_auto_1fr] md:gap-x-10 md:px-8 md:py-14 lg:gap-x-16 lg:py-20">
        {/* Photo (or video) */}
        <div className="relative col-start-1 row-start-1 h-[70svh] max-h-[720px] min-h-[440px] overflow-hidden bg-forest md:col-start-2 md:row-span-4 md:aspect-[4/5] md:h-auto md:max-h-none md:min-h-0 md:rounded-3xl md:shadow-[0_24px_60px_-24px_rgba(26,60,52,0.45)]">
          {photo ? (
            <>
              <Image
                src={photo.url}
                alt={photo.alt || 'Twinkles loc beads on locs'}
                fill
                priority
                sizes={SIZES}
                unoptimized={!optimise}
                className="object-cover"
              />
              {hero.videoUrl && poster && <HeroVideo src={hero.videoUrl} poster={poster} />}
              {!hero.image && <PhotoNeededBadge label="hero lifestyle photo (4:5) of Twinkles on real locs" />}
            </>
          ) : (
            <PhotoNeeded label="Hero lifestyle photo (4:5) of Twinkles on real locs" className="absolute inset-0" />
          )}
          <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-forest/95 via-forest/80 via-45% to-transparent to-85% md:hidden" />
        </div>

        {/* Headline and button: over the photo on phones */}
        <div className="relative z-10 col-start-1 row-start-1 self-end px-4 pb-7 text-cream md:row-start-2 md:self-auto md:p-0 md:text-forest">
          <p className="font-heading text-[13px] font-semibold uppercase tracking-[0.2em] text-cream/90 md:text-forest/80">
            <Copy text={hero.eyebrow} />
          </p>
          <h1 id="lp-hero-title" className="mt-4 font-display text-[2rem] leading-[1.2] md:text-[2.25rem] lg:text-[2.75rem]">
            <Copy text={hero.headline} display />
          </h1>
          <p className="mt-3 max-w-[34rem] font-body text-base leading-normal text-cream/90 md:mt-4 md:text-lg md:text-charcoal/80">
            <Copy text={hero.subhead} />
          </p>
          <a href="#best-sellers" className={`${BTN_PRIMARY} mt-6 w-full sm:w-auto md:mt-8 md:px-8`}>
            Shop Twinkles
          </a>
        </div>

        {/* Under the photo on phones */}
        <div className="col-start-1 row-start-2 px-4 pb-10 pt-5 md:row-start-3 md:p-0 md:pt-5">
          <LandingWhatsAppLink
            location="hero"
            className="inline-flex min-h-11 items-center gap-2 font-body text-base font-semibold text-forest underline decoration-gold decoration-2 underline-offset-4 hover:text-charcoal"
          >
            <WhatsAppIcon className="h-5 w-5 shrink-0 text-whatsapp-dark" />
            Not sure of your size? Ask us on WhatsApp
          </LandingWhatsAppLink>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-body text-[13px] font-medium text-charcoal/80 md:mt-6">
            {rating && (
              <li className="inline-flex items-center gap-1.5">
                <StarRating value={rating.average} className="text-sm" />
                <span>
                  {rating.average.toFixed(1)} from {rating.count.toLocaleString('en-NG')} reviews
                </span>
              </li>
            )}
            <li className="inline-flex items-center gap-1.5">
              <LockIcon className="h-4 w-4 text-forest" />
              Secure checkout by Paystack
            </li>
            <li className="inline-flex items-center gap-1.5">
              <TruckIcon className="h-4 w-4 text-forest" />
              Same-day Lagos delivery
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
