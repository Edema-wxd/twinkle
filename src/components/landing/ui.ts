/**
 * Shared classes for the ad landing page, from the site's tokens (globals.css).
 * Gold is reserved for primary buttons, stars and active choices, so every gold
 * thing on the page is clickable or a rating. Brand gold (#927750) fails AA with
 * any text colour at body size, so primary buttons are gold-light with forest
 * text (5.4:1).
 *
 * Display headings use Halimun, whose x-height is 0.31 em (Montserrat's is about
 * 0.52), so they sit a little above the spec's 32/48 and 24/32 scale to read at it.
 * Halimun has no digits: <DisplayText> sets them in Mistrully, as product names do.
 */

export const CONTAINER = 'mx-auto w-full max-w-[1120px] px-4 md:px-8'

/** 56 px top and bottom on phones, 96 px on desktop */
export const SECTION_Y = 'py-14 md:py-24'

export const H2 = 'font-display text-[1.75rem] leading-[1.25] text-forest md:text-[2.25rem]'
export const H3 = 'font-heading text-lg font-semibold leading-snug text-forest md:text-xl'
export const EYEBROW = 'font-heading text-[13px] font-semibold uppercase tracking-[0.18em] text-forest/80'
export const LEAD = 'font-body text-base leading-relaxed text-charcoal/80'

export const BTN_PRIMARY =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gold-light px-6 font-heading text-base font-bold text-forest shadow-sm transition-colors hover:bg-[#D8BC86] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest'

/** Primary button on a forest background: cream focus ring */
export const BTN_PRIMARY_ON_DARK = BTN_PRIMARY.replace('focus-visible:outline-forest', 'focus-visible:outline-cream')

export const BTN_OUTLINE_ON_DARK =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-cream/70 px-6 font-heading text-base font-semibold text-cream transition-colors hover:border-cream hover:bg-cream/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream'

export const TEXT_LINK = 'font-semibold text-forest underline decoration-gold decoration-2 underline-offset-4 hover:text-charcoal'

/** Fade-up on section enter (SectionReveal sets data-reveal); off with reduced motion */
export const REVEAL = 'transition-[opacity,transform] duration-200 ease-out data-[reveal=hidden]:translate-y-4 data-[reveal=hidden]:opacity-0'
