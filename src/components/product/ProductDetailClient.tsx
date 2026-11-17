'use client'

import { useEffect, useRef, useState } from 'react'
import { Product, ProductMaterial } from '@/lib/types/product'
import { ProductImageGallery } from './ProductImageGallery'
import { useCart } from '@/lib/cart/CartContext'
import { THREAD_COLOURS } from '@/lib/cart/threadColours'
import { firstFittingTier, lowStockLabel, packFits } from '@/lib/stockDisplay'
import { BUSINESS } from '@/lib/config/business'
import { StarRating, type RatingSummary } from './StarRating'
import { ShearsAddOn } from './ShearsAddOn'
import type { PopularChoice } from '@/lib/products/popularChoice'
import { freeDeliveryLine } from '@/lib/checkout/freeDelivery'

interface ProductDetailClientProps {
  product: Product
  /** Sanitised HTML, prepared on the server */
  descriptionHtml: string
  /** Average rating and count, shown under the title (links to the reviews) */
  rating?: RatingSummary
  /** Shears offered as a one-tap add-on under Add to cart (bead products only) */
  addOn?: Product | null
  /** What customers buy most: pre-selected so Add to cart works in one tap */
  popular?: PopularChoice
  /** Free Lagos delivery threshold (0 = no offer) */
  freeLagosOver?: number
}

/** Thread colour picked for people who don't choose one (the best seller once there are sales) */
const DEFAULT_THREAD = 'black'

const MATERIAL_BADGE: Record<ProductMaterial, string> = {
  Gold: 'bg-gold/20 text-forest',
  Silver: 'bg-white border border-charcoal/20 text-charcoal',
  Crystal: 'bg-cream border border-charcoal/20 text-charcoal',
  Tools: 'bg-forest/20 text-forest',
}

export function ProductDetailClient({ product, descriptionHtml, rating, addOn, popular, freeLagosOver = 0 }: ProductDetailClientProps) {
  const { dispatch } = useCart()

  // Start on the best-selling size and pack that's in stock, so the shopper can add straight away
  const popularPack = popular?.packs.find((p) => {
    const v = product.variants.find((x) => x.id === p.variantId)
    return v?.in_stock && v.price_tiers.some((t) => t.qty === p.tierQty) && packFits(v, p.tierQty)
  })
  const initialVariant =
    (popularPack && product.variants.find((v) => v.id === popularPack.variantId)) ?? product.variants.find((v) => v.in_stock) ?? product.variants[0]
  const popularVariantId = popularPack?.variantId ?? null
  const popularThread = THREAD_COLOURS.some((c) => c.id === popular?.threadColour) ? popular!.threadColour! : null

  const [selectedVariantId, setSelectedVariantId] = useState(initialVariant?.id ?? '')
  const [selectedTierQty, setSelectedTierQty] = useState(popularPack?.tierQty ?? firstFittingTier(initialVariant))
  const [selectedThreadColour, setSelectedThreadColour] = useState<string>(product.material === 'Tools' ? '' : (popularThread ?? DEFAULT_THREAD))
  const [justAdded, setJustAdded] = useState(false)

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId)
  const selectedTier = selectedVariant?.price_tiers.find((t) => t.qty === selectedTierQty)
  const displayPrice = selectedTier?.price ?? selectedVariant?.price ?? product.price_min

  const galleryImages = product.images?.length ? product.images : [product.image]
  const badgeClasses = MATERIAL_BADGE[product.material]

  const hasMultipleTiers = (selectedVariant?.price_tiers.length ?? 0) > 1

  const isSoldOut = !product.variants.some((v) => v.in_stock)
  const canAddToCart = packFits(selectedVariant, selectedTierQty)

  // Sticky "Add to cart" bar on phones while the main button is off screen
  const ctaRef = useRef<HTMLDivElement>(null)
  const [ctaInView, setCtaInView] = useState(true)
  const [footerInView, setFooterInView] = useState(false)
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const watch = (el: Element | null, set: (v: boolean) => void) => {
      if (!el) return null
      const io = new IntersectionObserver(([e]) => set(e.isIntersecting))
      io.observe(el)
      return io
    }
    const a = watch(ctaRef.current, setCtaInView)
    const b = watch(document.querySelector('[data-site-footer]'), setFooterInView)
    return () => {
      a?.disconnect()
      b?.disconnect()
    }
  }, [])
  const showStickyBar = !isSoldOut && !ctaInView && !footerInView

  /** Sticky bar button: add straight away (everything is pre-selected), or show the options if this size can't be bought */
  function stickyAction() {
    if (canAddToCart) return handleAddToCart()
    ctaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function handleVariantChange(variantId: string) {
    setSelectedVariantId(variantId)
    const newVariant = product.variants.find((v) => v.id === variantId)
    setSelectedTierQty(firstFittingTier(newVariant))
  }

  function handleAddToCart() {
    dispatch({
      type: 'ADD_ITEM',
      payload: {
        productId: product.id,
        variantId: selectedVariantId,
        tierQty: selectedTierQty,
        threadColour: product.material === 'Tools' ? '' : selectedThreadColour,
        productName: product.name,
        variantName: selectedVariant?.name ?? '',
        unitPrice: displayPrice,
        imageUrl: product.image,
        isTool: product.material === 'Tools',
        quantity: 1,
      },
    })
    setJustAdded(true)
    window.setTimeout(() => setJustAdded(false), 2500)
  }

  return (
    <>
      {/* Left column: Gallery */}
      <ProductImageGallery images={galleryImages} alt={product.name} />

      {/* Right column: Product info + interactive controls */}
      <div>
        {/* Material badge */}
        <span
          className={`inline-block text-xs font-body font-medium px-2 py-0.5 rounded-full mb-4 ${badgeClasses}`}
        >
          {product.material}
        </span>

        {/* Product name */}
        <h1 className="font-display text-3xl md:text-4xl text-forest mb-2">
          {product.name.split('').map((char, idx) =>
            /[0-9]/.test(char) ? (
              <span key={idx} className="font-accent-display">{char}</span>
            ) : (
              <span key={idx} className="font-display">{char}</span>
            )
          )}
        </h1>

        {/* Rating summary: jumps to the reviews */}
        {rating && rating.count > 0 && (
          <a href="#reviews" className="mb-3 inline-flex items-center gap-2 font-body text-sm text-charcoal/70 hover:text-forest">
            <StarRating value={rating.average} className="text-base" />
            <span className="underline decoration-gold underline-offset-2">
              {rating.average.toFixed(1)} ({rating.count} {rating.count === 1 ? 'review' : 'reviews'})
            </span>
          </a>
        )}

        {/* Price — updates on variant + tier selection */}
        <p className="font-heading text-2xl font-semibold text-gold-deep mb-1">
          ₦{displayPrice.toLocaleString()}
        </p>

        {/* Pack label — hidden for single-tier products (e.g. Shears) */}
        {hasMultipleTiers && (
          <p className="font-body text-sm text-charcoal/60 mb-5">
            Pack of {selectedTierQty} beads
          </p>
        )}
        {!hasMultipleTiers && <div className="mb-5" />}

        {/* Size picker */}
        <div className="mb-6">
          <p className="font-heading text-sm font-semibold text-forest mb-3 uppercase tracking-wide">
            Size
          </p>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                aria-pressed={selectedVariantId === variant.id}
                onClick={() => {
                  if (variant.in_stock) handleVariantChange(variant.id)
                }}
                disabled={!variant.in_stock}
                className={`rounded-lg px-4 py-2 font-body text-sm border-2 transition-all ${
                  !variant.in_stock
                    ? 'opacity-40 cursor-not-allowed border-charcoal/10 text-charcoal/40'
                    : selectedVariantId === variant.id
                    ? 'border-gold bg-gold/10 text-forest font-semibold'
                    : 'border-charcoal/20 text-charcoal hover:border-gold'
                }`}
              >
                {variant.name}
                {variant.id === popularVariantId && variant.in_stock && (
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-gold-deep">Most popular</span>
                )}
                {!variant.in_stock && (
                  <span className="block text-xs font-normal">(Out of stock)</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Pack-size picker — only shown when variant has more than 1 tier */}
        {hasMultipleTiers && selectedVariant && (
          <div className="mb-6">
            <p className="font-heading text-sm font-semibold text-forest mb-3 uppercase tracking-wide">
              Pack Size
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedVariant.price_tiers.map((tier) => (
                <button
                  key={tier.qty}
                  type="button"
                  aria-pressed={selectedTierQty === tier.qty}
                  disabled={!packFits(selectedVariant, tier.qty)}
                  title={packFits(selectedVariant, tier.qty) ? undefined : 'Not enough left for this pack size'}
                  onClick={() => setSelectedTierQty(tier.qty)}
                  className={`rounded-lg px-4 py-2 font-body text-sm border-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:line-through ${
                    selectedTierQty === tier.qty
                      ? 'border-gold bg-gold/10 text-forest font-semibold'
                      : 'border-charcoal/20 text-charcoal hover:border-gold'
                  }`}
                >
                  {tier.qty} beads
                </button>
              ))}
            </div>
          </div>
        )}

        {lowStockLabel(selectedVariant, product.material === 'Tools') && (
          <p role="status" className="-mt-2 mb-6 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 font-body text-xs font-medium text-amber-900 ring-1 ring-amber-200">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            {lowStockLabel(selectedVariant, product.material === 'Tools')}
          </p>
        )}

        {/* Thread colour: visual swatches with their names. A colour is always selected (the best seller), so it never blocks Add to cart */}
        {product.material !== 'Tools' && (
          <fieldset className="mb-8">
            <legend className="font-heading text-sm font-semibold text-forest mb-3 uppercase tracking-wide">
              Thread colour:{' '}
              <span className="font-body font-normal normal-case tracking-normal text-charcoal">
                {THREAD_COLOURS.find((c) => c.id === selectedThreadColour)?.label}
              </span>
            </legend>
            <div className="flex flex-wrap gap-x-1.5 gap-y-3">
              {THREAD_COLOURS.map((colour) => {
                const selected = selectedThreadColour === colour.id
                return (
                  <button
                    key={colour.id}
                    type="button"
                    onClick={() => setSelectedThreadColour(colour.id)}
                    aria-pressed={selected}
                    className="group flex w-16 flex-col items-center gap-1.5 rounded-lg py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  >
                    <span
                      aria-hidden="true"
                      className={`relative flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-charcoal/15 transition-all ${
                        selected ? 'outline outline-2 outline-offset-2 outline-forest' : 'group-hover:outline group-hover:outline-2 group-hover:outline-offset-2 group-hover:outline-charcoal/30'
                      }`}
                      style={{ backgroundColor: colour.hex }}
                    >
                      {selected && (
                        <svg viewBox="0 0 24 24" className={`h-5 w-5 ${colour.id === 'blonde' ? 'text-charcoal' : 'text-white'}`} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12.5l4.5 4.5L19 7.5" />
                        </svg>
                      )}
                    </span>
                    <span className={`font-body text-xs leading-tight text-center ${selected ? 'font-semibold text-forest' : 'text-charcoal/75'}`}>
                      {colour.label}
                      {colour.id === popularThread && <span className="block text-[10px] font-semibold uppercase tracking-wide text-gold-deep">Popular</span>}
                    </span>
                  </button>
                )
              })}
            </div>
          </fieldset>
        )}

        {/* Buying zone: Add to cart, delivery notes and the shears add-on. The sticky bar stays hidden while any of it is on screen */}
        <div ref={ctaRef}>
          {isSoldOut ? (
            <div className="rounded-lg bg-white ring-1 ring-forest/10 p-4">
              <p className="font-heading font-semibold text-forest">Sold out for now</p>
              <p className="mt-1 font-body text-sm text-charcoal/75">Message us and we&apos;ll tell you the moment it&apos;s back.</p>
              <a
                href={BUSINESS.whatsapp.url(`Hi! Please let me know when ${product.name} is back in stock.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-forest px-5 font-heading text-sm font-semibold text-cream hover:bg-forest/90"
              >
                Notify me on WhatsApp
              </a>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!canAddToCart}
              className={`flex w-full min-h-16 items-center justify-center gap-2 rounded-xl px-6 font-heading text-lg font-bold shadow-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-cream ${
                canAddToCart ? 'bg-forest text-cream shadow-forest/20 hover:bg-forest/90 active:scale-[0.99]' : 'bg-charcoal/10 text-charcoal/60 shadow-none cursor-not-allowed'
              }`}
            >
              <CartIcon />
              {!canAddToCart ? 'Not enough left in this size' : justAdded ? 'Added, add another' : `Add to cart · ₦${displayPrice.toLocaleString('en-NG')}`}
            </button>
          )}
          <ul className="mt-4 grid gap-1.5 font-body text-xs text-charcoal/75">
            {freeLagosOver > 0 && <li className="font-semibold text-green-800">{freeDeliveryLine(freeLagosOver)}</li>}
            <li>Delivery across Lagos and nationwide, <a href="/shipping" className="underline decoration-gold underline-offset-2 text-forest">see rates</a></li>
            <li>Secure checkout with Paystack</li>
            <li>Questions? <a href={BUSINESS.whatsapp.url(`Hi! I have a question about ${product.name}`)} target="_blank" rel="noopener noreferrer" className="underline decoration-gold underline-offset-2 text-forest">Ask us on WhatsApp</a></li>
          </ul>

          {/* Shears add-on, right where the buying decision happens */}
          {addOn && !isSoldOut && <ShearsAddOn shears={addOn} />}
        </div>

        {/* Description: after the buying controls so Add to cart is reachable without scrolling past it on phones */}
        <section aria-labelledby="about-heading" className="mt-10 border-t border-charcoal/10 pt-8">
          <h2 id="about-heading" className="font-heading text-sm font-semibold text-forest mb-3 uppercase tracking-wide">
            {product.material === 'Tools' ? 'About this tool' : 'About these beads'}
          </h2>
          <div
            className="font-body text-charcoal/80 leading-relaxed [&_p]:mb-4 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_li]:mb-1 [&_li_p]:mb-0 [&_h3]:font-heading [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:uppercase [&_h3]:tracking-wide [&_h3]:text-forest [&_h3]:mt-6 [&_h3]:mb-2 [&_strong]:font-semibold [&_strong]:text-charcoal [&_a]:text-forest [&_a]:underline [&_a]:decoration-gold"
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        </section>
      </div>

      {/* Phones only: slim bar with the price and Add to cart while the main button is off screen */}
      <div
        aria-hidden={!showStickyBar || undefined}
        inert={!showStickyBar}
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        className={`md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-charcoal/10 bg-cream/95 px-4 pt-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur transition-transform duration-300 motion-reduce:transition-none ${
          showStickyBar ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-sm font-semibold text-forest">{product.name}</p>
            <p className="font-body text-xs text-charcoal/70">
              ₦{displayPrice.toLocaleString('en-NG')}
              {hasMultipleTiers && <> · {selectedTierQty} beads</>}
              {selectedVariant && <> · {selectedVariant.name}</>}
              {product.material !== 'Tools' && <> · {THREAD_COLOURS.find((c) => c.id === selectedThreadColour)?.label} thread</>}
            </p>
          </div>
          <button
            type="button"
            onClick={stickyAction}
            className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl bg-forest px-5 font-heading text-base font-bold text-cream shadow-lg shadow-forest/20 hover:bg-forest/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <CartIcon />
            {canAddToCart ? (justAdded ? 'Added' : 'Add to cart') : 'See options'}
          </button>
        </div>
      </div>
    </>
  )
}

function CartIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 7h12l-1 12H7L6 7z" />
      <path d="M9 7a3 3 0 016 0" />
    </svg>
  )
}
