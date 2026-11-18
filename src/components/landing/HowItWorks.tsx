import { SIZE_GUIDE_SIZES, type LandingConfig } from '@/lib/landing/config'
import { Copy, DisplayText } from './Copy'
import { SizeGuideButton } from './SizeGuide'
import { BeadIcon, ParcelIcon, RulerIcon } from './icons'
import { CONTAINER, H2, REVEAL, SECTION_Y, TEXT_LINK } from './ui'

type Props = {
  sizeGuide: LandingConfig['sizeGuide']
  howItWorks: LandingConfig['howItWorks']
  /** Nationwide delivery time from Admin → Shipping, e.g. "3–5 business days" */
  otherDays: string
}

const VIDEO_HOSTS = /(^|\.)(youtube\.com|youtu\.be|tiktok\.com|instagram\.com|vimeo\.com)$/

/** A video link says "Watch", a blog post says "Read" */
function howToLabel(url: string): string {
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) return 'Watch the how-to'
  try {
    if (VIDEO_HOSTS.test(new URL(url).hostname)) return 'Watch the how-to'
  } catch {
    // a site path, e.g. a blog post
  }
  return 'Read the how-to'
}

/** Removes the three doubts that stop a first order: which size, how to put them in, how it gets to me */
export function HowItWorks({ sizeGuide, howItWorks, otherDays }: Props) {
  const cutoff = howItWorks.lagosCutoff.trim().replace(/\.$/, '')
  const howTo = howItWorks.howToUrl
  const external = howTo.startsWith('https://')

  const steps = [
    {
      icon: <RulerIcon />,
      title: 'Pick your size.',
      body: (
        <>
          <ul className="space-y-1">
            {SIZE_GUIDE_SIZES.map((s) => (
              <li key={s}>
                <strong className="font-semibold text-forest">{s}:</strong> <Copy text={sizeGuide.descriptions[s]} />
              </li>
            ))}
          </ul>
          <SizeGuideButton className={`mt-3 inline-flex min-h-11 items-center ${TEXT_LINK}`}>Open the size guide</SizeGuideButton>
        </>
      ),
    },
    {
      icon: <ParcelIcon />,
      title: 'We pack and send.',
      body: (
        <>
          <p>Same day in most of Lagos, {otherDays} nationwide.</p>
          {cutoff && (
            <p className="mt-2 font-semibold text-forest">
              <Copy text={cutoff} /> for same-day delivery in Lagos.
            </p>
          )}
        </>
      ),
    },
    {
      icon: <BeadIcon />,
      title: 'Slide them on.',
      body: (
        <>
          <p>Thread a bead onto the loc, slide it up, done. No glue, no heat.</p>
          {howTo && (
            <a
              href={howTo}
              {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className={`mt-3 inline-flex min-h-11 items-center ${TEXT_LINK}`}
            >
              {howToLabel(howTo)}
              {external && <span className="sr-only"> (opens in a new tab)</span>}
            </a>
          )}
        </>
      ),
    },
  ]

  return (
    <section aria-labelledby="how-title" data-reveal className={`bg-stone ${SECTION_Y} ${REVEAL}`}>
      <div className={CONTAINER}>
        <h2 id="how-title" className={H2}>
          <DisplayText text="From cart to crown in 3 steps" />
        </h2>
        <ol className="mt-8 grid gap-4 md:mt-12 md:grid-cols-3 md:gap-6">
          {steps.map((step, i) => (
            <li key={step.title} className="rounded-3xl bg-white p-6 ring-1 ring-forest/10 md:p-7">
              <div aria-hidden="true" className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-forest text-cream">{step.icon}</span>
                <span className="font-heading text-[13px] font-semibold uppercase tracking-[0.18em] text-forest/80">Step {i + 1}</span>
              </div>
              <h3 className="mt-5 font-heading text-lg font-semibold text-forest md:text-xl">
                <span className="sr-only">Step {i + 1}: </span>
                {step.title}
              </h3>
              <div className="mt-2 font-body text-base leading-normal text-charcoal/80">{step.body}</div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
