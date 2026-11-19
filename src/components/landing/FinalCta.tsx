import Image from 'next/image'
import type { LandingConfig } from '@/lib/landing/config'
import { canOptimise } from '@/lib/landing/images'
import { Copy, PhotoNeeded, PhotoNeededBadge } from './Copy'
import { EmailCapture } from './EmailCapture'
import { LandingWhatsAppLink } from './LandingWhatsAppLink'
import { WhatsAppIcon } from './icons'
import { BTN_OUTLINE_ON_DARK, BTN_PRIMARY_ON_DARK, CONTAINER, REVEAL, SECTION_Y } from './ui'

type Props = {
  finalCta: LandingConfig['finalCta']
  offer: LandingConfig['welcomeOffer']
  /** Product photo shown, marked "Photo needed", until the second lifestyle photo is uploaded */
  standInImage: string | null
}

/** For the visitor who scrolled everything and is still deciding: one more way in, plus the email offer */
export function FinalCta({ finalCta, offer, standInImage }: Props) {
  const photo = finalCta.image ?? (standInImage ? { url: standInImage, alt: 'Twinkles loc beads' } : null)

  return (
    <section id="final-cta" aria-labelledby="final-cta-title" data-reveal className={`relative overflow-hidden bg-forest text-cream ${SECTION_Y} ${REVEAL}`}>
      <div aria-hidden="true" className="absolute inset-0 bg-pattern-02 opacity-[0.06]" />
      <div className={`relative ${CONTAINER}`}>
        <div className="grid items-center gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-12">
          <div className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-3xl bg-cream/10 ring-1 ring-cream/15 md:aspect-[4/5] md:max-w-none">
            {photo ? (
              <>
                <Image
                  src={photo.url}
                  alt={photo.alt || 'Twinkles loc beads on locs'}
                  fill
                  sizes="(min-width: 1120px) 440px, (min-width: 768px) 42vw, (min-width: 480px) 448px, calc(100vw - 32px)"
                  unoptimized={!canOptimise(photo.url)}
                  className="object-cover"
                />
                {!finalCta.image && <PhotoNeededBadge label="second lifestyle photo for this band" />}
              </>
            ) : (
              <PhotoNeeded label="Second lifestyle photo of Twinkles on locs (4:5)" className="absolute inset-0" />
            )}
          </div>

          <div className="text-center">
            <h2 id="final-cta-title" className="font-display text-[2rem] leading-[1.2] text-cream md:text-[2.75rem]">
              <Copy text={finalCta.headline} display />
            </h2>
            <p className="mx-auto mt-3 max-w-md font-body text-base leading-normal text-cream/90 md:text-lg">
              <Copy text={finalCta.line} />
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <a href="#best-sellers" className={BTN_PRIMARY_ON_DARK}>
                Shop Twinkles
              </a>
              <LandingWhatsAppLink location="final" className={BTN_OUTLINE_ON_DARK}>
                <WhatsAppIcon />
                Order on WhatsApp
              </LandingWhatsAppLink>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-2xl rounded-3xl bg-cream/[0.06] p-6 ring-1 ring-cream/15 md:mt-16 md:p-8">
          <EmailCapture offer={offer} tone="dark" />
        </div>
      </div>
    </section>
  )
}
