'use client'

import { useEffect, useMemo, useState, useTransition, type ReactNode } from 'react'
import Image from 'next/image'
import {
  LANDING_PATH,
  SIZE_GUIDE_SIZES,
  type FeaturedProductConfig,
  type HeroVariant,
  type LandingConfig,
} from '@/lib/landing/config'
import { THREAD_COLOURS } from '@/lib/cart/threadColours'
import { naira } from '@/lib/checkout/freeDelivery'
import { NUMBER_LIMITS, placeholderFields, validateLandingForm, type LandingProductOption } from '../_lib/landing-form'
import { ImageField, NumberField, Section, SelectField, SubHeading, TextField, ToggleField, VideoField, fieldId } from './LandingFormFields'
import { PhotoPicker } from './PhotoPicker'

interface LandingPageFormProps {
  initialConfig: LandingConfig
  /** Active products, for the best-seller pickers */
  products: LandingProductOption[]
  /** What the announcement bar says when its field is empty */
  autoAnnouncementText: string
  /** Free Lagos delivery threshold from Admin → Shipping (0 = off) */
  freeLagosOver: number
  reviewStats: { photoReviews: number; totalReviews: number }
  /** Landing FAQ answers still holding "[confirm" (counted on the server) */
  faqSignOffCount: number
  /** e.g. https://twinklelocs.com, for the hero version links */
  siteUrl: string
  /** The landing page FAQs panel, shown in page order */
  faqPanel: ReactNode
}

const MAX_FEATURED = 3
const MAX_INSTAGRAM = 6
const MAX_HERO_VERSIONS = 10
const NO_CHOICE = ''

const btnSmall = 'rounded-md bg-stone-800 px-2.5 py-1 text-xs text-stone-300 transition-colors hover:bg-stone-700 hover:text-white disabled:opacity-40'
const btnAdd =
  'rounded-lg border border-dashed border-stone-600 px-4 py-2 text-sm text-stone-300 transition-colors hover:border-gold/60 hover:text-white disabled:opacity-40'

function move<T>(list: T[], from: number, to: number): T[] {
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export function LandingPageForm(props: LandingPageFormProps) {
  const { products, autoAnnouncementText, freeLagosOver, reviewStats, faqSignOffCount, siteUrl, faqPanel } = props
  const [config, setConfig] = useState<LandingConfig>(props.initialConfig)
  const [savedJson, setSavedJson] = useState(() => JSON.stringify(props.initialConfig))
  const [attempted, setAttempted] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const dirty = JSON.stringify(config) !== savedJson
  const errors = useMemo(() => validateLandingForm(config), [config])
  const signOff = useMemo(() => placeholderFields(config), [config])
  const err = (path: string) => {
    const e = errors[path]
    return e && (attempted || !e.missing) ? e.message : undefined
  }

  function update(change: (draft: LandingConfig) => void) {
    setConfig((prev) => {
      const next = structuredClone(prev)
      change(next)
      return next
    })
  }

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message })
    if (type === 'success') setTimeout(() => setToast(null), 4000)
  }

  // Warn before leaving with unsaved changes (closing the tab, or a link in the admin menu)
  useEffect(() => {
    if (!dirty) return
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest('a')
      if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey) return
      const href = a.getAttribute('href') ?? ''
      if (!href.startsWith('/')) return
      if (!window.confirm('You have unsaved changes on the landing page. Leave without saving?')) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('beforeunload', onUnload)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('beforeunload', onUnload)
      document.removeEventListener('click', onClick, true)
    }
  }, [dirty])

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setAttempted(true)
    const count = Object.keys(errors).length
    if (count > 0) {
      showToast('error', count === 1 ? 'One field needs fixing first (marked in red).' : `${count} fields need fixing first (marked in red).`)
      setTimeout(() => {
        const first = document.querySelector<HTMLElement>('[aria-invalid="true"]')
        first?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
        first?.focus({ preventScroll: true })
      }, 0)
      return
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/landing-page', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        })
        const data = (await res.json().catch(() => ({}))) as { config?: LandingConfig; error?: string }
        if (!res.ok || !data.config) {
          showToast('error', data.error ?? 'Could not save. Please try again.')
          return
        }
        setConfig(data.config)
        setSavedJson(JSON.stringify(data.config))
        setAttempted(false)
        showToast('success', 'Saved. The live landing page shows these changes now.')
      } catch {
        showToast('error', 'Network error, please try again.')
      }
    })
  }

  async function copyLink(key: string, link: string) {
    try {
      await navigator.clipboard.writeText(link)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000)
    } catch {
      showToast('error', 'Could not copy. Select the link and copy it instead.')
    }
  }

  const productBySlug = new Map(products.map((p) => [p.slug, p]))
  // Free Lagos delivery is judged on the items before any discount, so a code never takes it away
  const minOrder = config.welcomeOffer.minOrder
  const minOrderNote =
    !Number.isInteger(minOrder) || minOrder <= 0
      ? undefined
      : freeLagosOver > 0 && minOrder < freeLagosOver
        ? `Free Lagos delivery starts at ${naira(freeLagosOver)} (Admin → Shipping), so smaller orders using the code still pay for delivery.`
        : 'Orders this size also get free Lagos delivery when it is on (Admin → Shipping).'
  const totalSignOff = signOff.length + faqSignOffCount

  return (
    <form onSubmit={handleSave} noValidate className="space-y-6">
      {/* ── Sign-off summary ─────────────────────────────────────────────── */}
      {totalSignOff > 0 ? (
        <div className="rounded-xl bg-amber-950/40 p-4 ring-1 ring-amber-500/40">
          <p className="text-sm font-semibold text-amber-200">
            {totalSignOff === 1 ? '1 field still needs sign-off before ads run' : `${totalSignOff} fields still need sign-off before ads run`}
          </p>
          <p className="mt-1 text-xs text-amber-200/80">
            These still say &ldquo;[confirm&rdquo;. Replace the wording with the final text (and remove the [confirm] note) once it&rsquo;s approved.
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {signOff.map((f) => (
              <li key={f.path}>
                <a href={`#${fieldId(f.path)}`} className="inline-block rounded-full bg-amber-900/50 px-2.5 py-1 text-xs text-amber-100 hover:bg-amber-800/60">
                  {f.label}
                </a>
              </li>
            ))}
            {faqSignOffCount > 0 && (
              <li>
                <a href="#landing-faqs" className="inline-block rounded-full bg-amber-900/50 px-2.5 py-1 text-xs text-amber-100 hover:bg-amber-800/60">
                  {faqSignOffCount === 1 ? '1 FAQ answer' : `${faqSignOffCount} FAQ answers`}
                </a>
              </li>
            )}
          </ul>
        </div>
      ) : (
        <p className="rounded-xl bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200 ring-1 ring-emerald-600/30">
          Nothing is waiting for sign-off. The page is ready for ads.
        </p>
      )}

      {/* ── 1. Announcement bar ─────────────────────────────────────────── */}
      <Section id="announcement" step={1} title="Announcement bar" intro="The thin strip at the very top of the page.">
        <TextField
          path="announcement"
          label="Announcement text"
          value={config.announcement}
          onChange={(v) => update((d) => void (d.announcement = v))}
          maxLength={160}
          placeholder={autoAnnouncementText}
          help={
            <>
              Leave empty to use the automatic line: <span className="text-stone-300">&ldquo;{autoAnnouncementText}&rdquo;</span>. It is built from Admin
              &rarr; Shipping (free Lagos delivery amount and nationwide days), so it updates by itself when you change those.
            </>
          }
        />
      </Section>

      {/* ── 2. Hero ─────────────────────────────────────────────────────── */}
      <Section id="hero" step={2} title="Hero" intro="The first thing people see: a big photo with the headline and the Shop Twinkles button.">
        <ImageField
          path="hero.image"
          label="Hero photo"
          value={config.hero.image}
          onChange={(v) => update((d) => void (d.hero.image = v))}
          altError={err('hero.image.alt')}
          previewClass="w-24 h-30"
          help="A close-up of locs styled with Twinkles, in warm natural light. Tall photos (4:5) look best on phones. Keep it small (around 200 KB) so the page loads fast."
        />
        <VideoField
          path="hero.videoUrl"
          label="Video (optional)"
          value={config.hero.videoUrl}
          onChange={(v) => update((d) => void (d.hero.videoUrl = v))}
          placeholder="https://…/hero.mp4"
          error={err('hero.videoUrl')}
          help="A 6 to 10 second muted loop, same crop as the photo. Upload an MP4 under 1.5 MB, or paste an https link. The photo shows while the video loads, so keep a photo too."
        />
        <TextField
          path="hero.eyebrow"
          label="Small line above the headline"
          value={config.hero.eyebrow}
          onChange={(v) => update((d) => void (d.hero.eyebrow = v))}
          maxLength={80}
        />
        <TextField path="hero.headline" label="Headline" value={config.hero.headline} onChange={(v) => update((d) => void (d.hero.headline = v))} maxLength={120} />
        <TextField
          path="hero.subhead"
          label="Line under the headline"
          value={config.hero.subhead}
          onChange={(v) => update((d) => void (d.hero.subhead = v))}
          maxLength={300}
          rows={3}
        />

        <SubHeading>Hero versions for ad tests</SubHeading>
        <div className="space-y-1 text-sm text-stone-400">
          <p>Point each ad at its own version&rsquo;s link to see which hero sells best. Add your UTM tags to the end as usual.</p>
          <p className="text-xs text-stone-500">
            Anything you leave empty in a version uses the main hero above. The plain link{' '}
            <span className="text-stone-300">
              {siteUrl}
              {LANDING_PATH}
            </span>{' '}
            always shows the main hero.
          </p>
        </div>

        {config.hero.variants.map((v, i) => (
          <HeroVersionEditor
            key={i}
            index={i}
            variant={v}
            link={v.key ? `${siteUrl}${LANDING_PATH}/${v.key}` : null}
            copied={copiedKey === v.key && v.key !== ''}
            onCopy={(link) => copyLink(v.key, link)}
            err={err}
            onChange={(change) => update((d) => change(d.hero.variants[i]))}
            onRemove={() => {
              if (window.confirm(`Remove hero version ${i + 1}? Ads pointing at its link will show the main hero instead.`)) {
                update((d) => void d.hero.variants.splice(i, 1))
              }
            }}
          />
        ))}
        <button
          type="button"
          className={btnAdd}
          disabled={config.hero.variants.length >= MAX_HERO_VERSIONS}
          onClick={() => update((d) => void d.hero.variants.push({ key: '', label: '', image: null, videoUrl: null, headline: '', subhead: '' }))}
        >
          {config.hero.variants.length >= MAX_HERO_VERSIONS ? `Up to ${MAX_HERO_VERSIONS} versions` : '+ Add a hero version'}
        </button>
      </Section>

      {/* ── 3. Best-sellers ─────────────────────────────────────────────── */}
      <Section
        id="best-sellers"
        step={3}
        title="Best-sellers"
        intro={
          <>
            <p>Up to {MAX_FEATURED} products people can add to cart right on the page, in this order. Prices always come from the product itself.</p>
            <p className="text-xs text-stone-500">
              Each card starts on the size, pack and thread colour customers actually buy most (worked out from paid orders). The choices under
              &ldquo;Starting choice&rdquo; are only used until a product has sales, or when its best-seller is out of stock.
            </p>
          </>
        }
      >
        {config.featured.map((f, i) => (
          <FeaturedEditor
            key={i}
            index={i}
            item={f}
            count={config.featured.length}
            product={productBySlug.get(f.slug)}
            products={products}
            err={err}
            onChange={(change) => update((d) => change(d.featured[i]))}
            onMove={(to) => update((d) => void (d.featured = move(d.featured, i, to)))}
            onRemove={() => update((d) => void d.featured.splice(i, 1))}
          />
        ))}
        <button
          type="button"
          className={btnAdd}
          disabled={config.featured.length >= MAX_FEATURED}
          onClick={() => update((d) => void d.featured.push({ slug: '', tagline: '', fallback: { size: null, pack: null, thread: null } }))}
        >
          {config.featured.length >= MAX_FEATURED ? `Up to ${MAX_FEATURED} best-sellers` : '+ Add a best-seller'}
        </button>
      </Section>

      {/* ── 4. Reviews and Instagram ────────────────────────────────────── */}
      <Section
        id="reviews"
        step={4}
        title="Customer reviews and Instagram"
        intro={
          <>
            <p>
              The reviews carousel uses reviews from Admin &rarr; Reviews that have a customer photo and written permission. You have{' '}
              <span className="text-stone-200">{reviewStats.photoReviews}</span> now; the section shows once there are{' '}
              <span className="text-stone-200">{config.minReviewsToShowSection}</span> (change this under Thresholds).
            </p>
          </>
        }
      >
        <SubHeading>Instagram photos</SubHeading>
        <p className="text-sm text-stone-400">
          Up to {MAX_INSTAGRAM} photos customers tagged you in (saved as photos, with their permission). Square photos work best. The grid only shows with
          4 or more; you have <span className="text-stone-200">{config.instagram.length}</span>.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {config.instagram.map((p, i) => (
            <div key={i} className="space-y-3 rounded-lg bg-stone-800/50 p-3 ring-1 ring-stone-700">
              <div className="flex items-start gap-3">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-stone-600">
                  <Image src={p.url} alt="" fill className="object-cover" sizes="80px" unoptimized />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" className={btnSmall} disabled={i === 0} onClick={() => update((d) => void (d.instagram = move(d.instagram, i, i - 1)))}>
                    &larr; Earlier
                  </button>
                  <button
                    type="button"
                    className={btnSmall}
                    disabled={i === config.instagram.length - 1}
                    onClick={() => update((d) => void (d.instagram = move(d.instagram, i, i + 1)))}
                  >
                    Later &rarr;
                  </button>
                  <button type="button" className={`${btnSmall} text-red-300`} onClick={() => update((d) => void d.instagram.splice(i, 1))}>
                    Remove
                  </button>
                </div>
              </div>
              <TextField
                path={`instagram.${i}.alt`}
                label="Describe the photo"
                value={p.alt}
                onChange={(v) => update((d) => void (d.instagram[i].alt = v))}
                maxLength={200}
                placeholder="e.g. Customer wearing Silver Twinkles on long locs"
                error={err(`instagram.${i}.alt`)}
              />
              <TextField
                path={`instagram.${i}.postUrl`}
                label="Instagram post link (optional)"
                value={p.postUrl ?? ''}
                onChange={(v) => update((d) => void (d.instagram[i].postUrl = v.trim() ? v : null))}
                maxLength={1000}
                placeholder="https://www.instagram.com/p/…"
                error={err(`instagram.${i}.postUrl`)}
              />
            </div>
          ))}
        </div>
        {config.instagram.length < MAX_INSTAGRAM && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-stone-300">Add a photo</p>
            <PhotoPicker
              url={null}
              onChange={(url) => url && update((d) => void d.instagram.push({ url, alt: '', postUrl: null }))}
              libraryTitle="Add an Instagram photo"
              purpose="product"
              previewClass="w-20 h-20"
            />
          </div>
        )}
      </Section>

      {/* ── 5. How it works ─────────────────────────────────────────────── */}
      <Section id="how-it-works" step={5} title="How it works" intro="The three steps: pick your size, we pack and send, slide them on.">
        <TextField
          path="howItWorks.lagosCutoff"
          label="Lagos same-day cut-off (step 2)"
          value={config.howItWorks.lagosCutoff}
          onChange={(v) => update((d) => void (d.howItWorks.lagosCutoff = v))}
          maxLength={80}
          placeholder="e.g. Order before 12pm for same-day delivery"
          help="Leave empty to leave it out."
        />
        <TextField
          path="howItWorks.howToUrl"
          label="“Watch the 30-second how-to” link (step 3)"
          value={config.howItWorks.howToUrl}
          onChange={(v) => update((d) => void (d.howItWorks.howToUrl = v))}
          maxLength={1000}
          placeholder="/blog/how-to-put-beads-in-locs"
          error={err('howItWorks.howToUrl')}
          help="A video link (https://…) or a blog post on this site (starting with /). Leave empty to hide the link."
        />
      </Section>

      {/* ── 6. Size guide ───────────────────────────────────────────────── */}
      <Section id="size-guide" step={6} title="Size guide" intro="Opens from “Which size?” on each best-seller and from How it works.">
        <div className="grid gap-5 lg:grid-cols-3">
          {SIZE_GUIDE_SIZES.map((s) => (
            <div key={s} className="space-y-3 rounded-lg bg-stone-800/50 p-3 ring-1 ring-stone-700">
              <ImageField
                path={`sizeGuide.photos.${s}`}
                label={`${s} on a loc`}
                value={config.sizeGuide.photos[s]}
                onChange={(v) => update((d) => void (d.sizeGuide.photos[s] = v))}
                altError={err(`sizeGuide.photos.${s}.alt`)}
                purpose="product"
                previewClass="w-20 h-20"
              />
              <TextField
                path={`sizeGuide.descriptions.${s}`}
                label={`Who ${s} is for`}
                value={config.sizeGuide.descriptions[s]}
                onChange={(v) => update((d) => void (d.sizeGuide.descriptions[s] = v))}
                maxLength={200}
                rows={2}
              />
            </div>
          ))}
        </div>
        <TextField
          path="sizeGuide.betweenSizesLine"
          label="Between sizes line"
          value={config.sizeGuide.betweenSizesLine}
          onChange={(v) => update((d) => void (d.sizeGuide.betweenSizesLine = v))}
          maxLength={200}
        />
      </Section>

      {/* ── 7. Shipping and payment ─────────────────────────────────────── */}
      <Section
        id="shipping-payment"
        step={7}
        title="Shipping and payment"
        intro="Delivery prices and free delivery come from Admin → Shipping, so they always match checkout."
      >
        <TextField
          path="returnsLine"
          label="Returns line"
          value={config.returnsLine}
          onChange={(v) => update((d) => void (d.returnsLine = v))}
          maxLength={300}
          rows={2}
          help="One sentence under the delivery and payment cards."
        />
      </Section>

      {/* ── 8. FAQs (saved separately) ──────────────────────────────────── */}
      {faqPanel}

      {/* ── 9. Final band ───────────────────────────────────────────────── */}
      <Section id="final-cta" step={9} title="Final band" intro="The dark band near the bottom for people still deciding, above the welcome offer sign-up.">
        <ImageField
          path="finalCta.image"
          label="Photo"
          value={config.finalCta.image}
          onChange={(v) => update((d) => void (d.finalCta.image = v))}
          altError={err('finalCta.image.alt')}
          help="A second lifestyle photo, different from the hero."
        />
        <TextField path="finalCta.headline" label="Headline" value={config.finalCta.headline} onChange={(v) => update((d) => void (d.finalCta.headline = v))} maxLength={120} />
        <TextField path="finalCta.line" label="Line under the headline" value={config.finalCta.line} onChange={(v) => update((d) => void (d.finalCta.line = v))} maxLength={200} />
      </Section>

      {/* ── 10. Welcome offer ───────────────────────────────────────────── */}
      <Section
        id="welcome-offer"
        step={10}
        title="Welcome offer"
        intro="The email sign-up near the bottom. Each person who signs up gets their own code that works once; you can see them under Promo Codes."
      >
        <ToggleField
          path="welcomeOffer.enabled"
          label="Offer a discount code for signing up"
          help="Off = the sign-up form is just for the newsletter."
          checked={config.welcomeOffer.enabled}
          onChange={(v) => update((d) => void (d.welcomeOffer.enabled = v))}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            path="welcomeOffer.percent"
            label="Discount (% off)"
            value={config.welcomeOffer.percent}
            onChange={(v) => update((d) => void (d.welcomeOffer.percent = v))}
            {...NUMBER_LIMITS['welcomeOffer.percent']}
            error={err('welcomeOffer.percent')}
          />
          <NumberField
            path="welcomeOffer.expiryHours"
            label="Code valid for (hours)"
            value={config.welcomeOffer.expiryHours}
            onChange={(v) => update((d) => void (d.welcomeOffer.expiryHours = v))}
            {...NUMBER_LIMITS['welcomeOffer.expiryHours']}
            error={err('welcomeOffer.expiryHours')}
            help="Counted from when they sign up."
          />
        </div>
        <NumberField
          path="welcomeOffer.minOrder"
          label="Minimum order (₦, items before delivery; 0 = none)"
          value={config.welcomeOffer.minOrder}
          onChange={(v) => update((d) => void (d.welcomeOffer.minOrder = v))}
          {...NUMBER_LIMITS['welcomeOffer.minOrder']}
          step={1000}
          prefix="₦"
          error={err('welcomeOffer.minOrder')}
          help={minOrderNote}
        />
        <ToggleField
          path="welcomeOffer.popup"
          label="Also show the offer in a pop-up"
          help="Appears once per visitor, after 25 seconds (or when they're about to leave, on a computer). Off is fine: the offer is always near the bottom of the page."
          checked={config.welcomeOffer.popup}
          onChange={(v) => update((d) => void (d.welcomeOffer.popup = v))}
        />
      </Section>

      {/* ── 11. Thresholds ──────────────────────────────────────────────── */}
      <Section id="thresholds" step={11} title="When to show things" intro="So the page never shows an empty or unconvincing section.">
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            path="minReviewsToShowSection"
            label="Photo reviews needed to show the reviews section"
            value={config.minReviewsToShowSection}
            onChange={(v) => update((d) => void (d.minReviewsToShowSection = v))}
            {...NUMBER_LIMITS.minReviewsToShowSection}
            error={err('minReviewsToShowSection')}
            help={`You have ${reviewStats.photoReviews} photo ${reviewStats.photoReviews === 1 ? 'review' : 'reviews'} with permission.`}
          />
          <NumberField
            path="minReviewsToShowRating"
            label="Reviews needed to show the star rating line"
            value={config.minReviewsToShowRating}
            onChange={(v) => update((d) => void (d.minReviewsToShowRating = v))}
            {...NUMBER_LIMITS.minReviewsToShowRating}
            error={err('minReviewsToShowRating')}
            help={`“★ 4.8 from N customers” under the hero button. You have ${reviewStats.totalReviews} ${reviewStats.totalReviews === 1 ? 'review' : 'reviews'} in total.`}
          />
          <NumberField
            path="stockWarningAt"
            label="Low stock: show “Only N packs left” at or under"
            value={config.stockWarningAt}
            onChange={(v) => update((d) => void (d.stockWarningAt = v))}
            {...NUMBER_LIMITS.stockWarningAt}
            error={err('stockWarningAt')}
            help="Packs, for products whose stock you track. 0 = never show it."
          />
        </div>
      </Section>

      {/* ── Save bar ────────────────────────────────────────────────────── */}
      <div className="sticky bottom-0 z-10 -mx-6 flex flex-wrap items-center gap-3 border-t border-stone-800 bg-stone-950/95 px-6 py-3 backdrop-blur lg:-mx-8 lg:px-8">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gold-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Save landing page'}
        </button>
        <a href={LANDING_PATH} target="_blank" rel="noopener noreferrer" className="text-sm text-stone-300 underline hover:text-white">
          View page
        </a>
        <div aria-live="polite" className="min-w-0 flex-1 text-sm">
          {toast ? (
            <span className={toast.type === 'success' ? 'text-emerald-300' : 'text-red-300'}>{toast.message}</span>
          ) : dirty ? (
            <span className="text-stone-400">Unsaved changes</span>
          ) : null}
        </div>
      </div>
    </form>
  )
}

// ── Hero version ──────────────────────────────────────────────────────────────

function HeroVersionEditor(props: {
  index: number
  variant: HeroVariant
  link: string | null
  copied: boolean
  onCopy: (link: string) => void
  err: (path: string) => string | undefined
  onChange: (change: (v: HeroVariant) => void) => void
  onRemove: () => void
}) {
  const { index: i, variant: v, link, copied, onCopy, err, onChange, onRemove } = props
  const p = `hero.variants.${i}`
  const keyError = err(`${p}.key`)
  return (
    <div className="space-y-4 rounded-lg bg-stone-800/50 p-4 ring-1 ring-stone-700">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-stone-200">
          Version {i + 1}
          {v.label && <span className="font-normal text-stone-400">: {v.label}</span>}
        </p>
        <button type="button" onClick={onRemove} className={`${btnSmall} text-red-300`}>
          Remove
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          path={`${p}.key`}
          label="Link name"
          value={v.key}
          onChange={(val) => onChange((d) => void (d.key = val.toLowerCase().replace(/\s+/g, '-')))}
          maxLength={40}
          placeholder="e.g. gold-video"
          error={keyError}
          help="Lowercase letters, numbers and hyphens. Changing it changes the link, so update any ads using the old one."
        />
        <TextField
          path={`${p}.label`}
          label="Name (only you see this)"
          value={v.label}
          onChange={(val) => onChange((d) => void (d.label = val))}
          maxLength={80}
          placeholder="e.g. Gold video, November ads"
        />
      </div>

      {link && !keyError && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-stone-900 px-3 py-2">
          <code className="min-w-0 flex-1 break-all text-xs text-gold-light">{link}</code>
          <button type="button" onClick={() => onCopy(link)} className={btnSmall}>
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      )}

      <ImageField
        path={`${p}.image`}
        label="Photo (empty = main hero photo)"
        value={v.image}
        onChange={(val) => onChange((d) => void (d.image = val))}
        altError={err(`${p}.image.alt`)}
        previewClass="w-20 h-25"
      />
      <VideoField
        path={`${p}.videoUrl`}
        label="Video (optional)"
        value={v.videoUrl}
        onChange={(val) => onChange((d) => void (d.videoUrl = val))}
        placeholder="https://…/version.mp4"
        error={err(`${p}.videoUrl`)}
        help="MP4 under 1.5 MB. If this version has its own photo but no video, no video plays."
      />
      <TextField
        path={`${p}.headline`}
        label="Headline (empty = main headline)"
        value={v.headline}
        onChange={(val) => onChange((d) => void (d.headline = val))}
        maxLength={120}
      />
      <TextField
        path={`${p}.subhead`}
        label="Line under the headline (empty = main line)"
        value={v.subhead}
        onChange={(val) => onChange((d) => void (d.subhead = val))}
        maxLength={300}
        rows={2}
      />
    </div>
  )
}

// ── Best-seller ───────────────────────────────────────────────────────────────

function FeaturedEditor(props: {
  index: number
  item: FeaturedProductConfig
  count: number
  product: LandingProductOption | undefined
  products: LandingProductOption[]
  err: (path: string) => string | undefined
  onChange: (change: (f: FeaturedProductConfig) => void) => void
  onMove: (to: number) => void
  onRemove: () => void
}) {
  const { index: i, item: f, count, product, products, err, onChange, onMove, onRemove } = props
  const p = `featured.${i}`
  const missing = f.slug !== '' && !product

  const productOptions = [
    ...(f.slug === '' ? [{ value: NO_CHOICE, label: 'Pick a product…' }] : []),
    ...(missing ? [{ value: f.slug, label: `${f.slug} (hidden or deleted)` }] : []),
    ...products.map((o) => ({ value: o.slug, label: o.name })),
  ]

  const sizeVariant = product?.variants.find((v) => v.name === f.fallback.size)
  const packs = [...new Set((sizeVariant ? [sizeVariant] : product?.variants ?? []).flatMap((v) => v.packs))].sort((a, b) => a - b)
  const showThread = product ? product.material !== 'Tools' : true

  return (
    <div className="space-y-4 rounded-lg bg-stone-800/50 p-4 ring-1 ring-stone-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-stone-200">Best-seller {i + 1}</p>
        <div className="flex gap-1.5">
          <button type="button" className={btnSmall} disabled={i === 0} onClick={() => onMove(i - 1)} aria-label={`Move best-seller ${i + 1} up`}>
            &uarr; Up
          </button>
          <button type="button" className={btnSmall} disabled={i === count - 1} onClick={() => onMove(i + 1)} aria-label={`Move best-seller ${i + 1} down`}>
            &darr; Down
          </button>
          <button type="button" className={`${btnSmall} text-red-300`} onClick={onRemove}>
            Remove
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          path={`${p}.slug`}
          label="Product"
          value={f.slug}
          options={productOptions}
          error={err(`${p}.slug`)}
          help={missing ? 'This product is hidden or no longer exists, so the page skips it. Pick another one.' : undefined}
          onChange={(slug) =>
            onChange((d) => {
              d.slug = slug
              d.fallback = { size: null, pack: null, thread: null }
            })
          }
        />
        <TextField
          path={`${p}.tagline`}
          label="Tagline"
          value={f.tagline}
          onChange={(val) => onChange((d) => void (d.tagline = val))}
          maxLength={160}
          placeholder="e.g. Our richest gold, for statement styles"
          help="One short line under the name."
        />
      </div>

      {product && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Starting choice (until there are sales)</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField
              path={`${p}.fallback.size`}
              label="Size"
              value={f.fallback.size ?? NO_CHOICE}
              options={[{ value: NO_CHOICE, label: 'No preference' }, ...product.variants.map((v) => ({ value: v.name, label: v.name }))]}
              onChange={(size) =>
                onChange((d) => {
                  d.fallback.size = size || null
                  const v = product.variants.find((x) => x.name === size)
                  if (v && d.fallback.pack !== null && !v.packs.includes(d.fallback.pack)) d.fallback.pack = null
                })
              }
            />
            <SelectField
              path={`${p}.fallback.pack`}
              label="Pack"
              value={f.fallback.pack === null ? NO_CHOICE : String(f.fallback.pack)}
              options={[{ value: NO_CHOICE, label: 'No preference' }, ...packs.map((q) => ({ value: String(q), label: `Pack of ${q}` }))]}
              onChange={(pack) => onChange((d) => void (d.fallback.pack = pack ? Number(pack) : null))}
            />
            {showThread && (
              <SelectField
                path={`${p}.fallback.thread`}
                label="Thread colour"
                value={f.fallback.thread ?? NO_CHOICE}
                options={[{ value: NO_CHOICE, label: 'No preference' }, ...THREAD_COLOURS.map((t) => ({ value: t.id, label: t.label }))]}
                onChange={(thread) => onChange((d) => void (d.fallback.thread = thread || null))}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
