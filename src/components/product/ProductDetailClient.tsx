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

interface ProductDetailClientProps {
  product: Product
  /** Sanitised HTML, prepared on the server */
  descriptionHtml: string
  /** Average rating and count, shown under the title (links to the reviews) */
  rating?: RatingSummary
  /** Shears offered as a one-tap add-on under Add to cart (bead products only) */
  addOn?: Product | null
}

const MATERIAL_BADGE: Record<ProductMaterial, string> = {
  Gold: 'bg-gold/20 text-forest',
  Silver: 'bg-white border border-charcoal/20 text-charcoal',
  Crystal: 'bg-cream border border-charcoal/20 text-charcoal',
  Tools: 'bg-forest/20 text-forest',
}

export function ProductDetailClient({ product, descriptionHtml, rating, addOn }: ProductDetailClientProps) {
  const { dispatch } = useCart()

  const initialVariant = product.variants.find((v) => v.in_stock) ?? product.variants[0]

  const [selectedVariantId, setSelectedVariantId] = useState(initialVariant?.id ?? '')
  const [selectedTierQty, setSelectedTierQty] = useState(
    firstFittingTier(initialVariant)
  )
  const [selectedThreadColour, setSelectedThreadColour] = useState<string | null>(
    product.material === 'Tools' ? '' : null
  )

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId)
  const selectedTier = selectedVariant?.price_tiers.find((t) => t.qty === selectedTierQty)
  const displayPrice = selectedTier?.price ?? selectedVariant?.price ?? product.price_min

  const galleryImages = product.images?.length ? product.images : [product.image]
  const badgeClasses = MATERIAL_BADGE[product.material]

  const hasMultipleTiers = (selectedVariant?.price_tiers.length ?? 0) > 1

  const isSoldOut = !product.variants.some((v) => v.in_stock)
  const canAddToCart = packFits(selectedVariant, selectedTierQty) && (product.material === 'Tools' || selectedThreadColour !== null)

  // Sticky "Add to cart" bar on phones while the main button is off screen
  const ctaRef = useRef<HTMLDivElement>(null)
  const threadRef = useRef<HTMLDivElement>(null)
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

  /** Sticky bar button: add if everything's chosen, otherwise take them to what's missing */
  function stickyAction() {
    if (canAddToCart) return handleAddToCart()
    const target = product.material !== 'Tools' && selectedThreadColour === null ? threadRef.current : ctaRef.current
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    target?.querySelector<HTMLElement>('button:not([disabled])')?.focus({ preventScroll: true })
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
        threadColour: product.material === 'Tools' ? '' : selectedThreadColour!,
        productName: product.name,
        variantName: selectedVariant?.name ?? '',
        unitPrice: displayPrice,
        imageUrl: product.image,
        isTool: product.material === 'Tools',
        quantity: 1,
      },
    })
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

        {/* Thread colour picker — interactive, not shown for Tools (e.g. Shears) */}
        {product.material !== 'Tools' && (
          <div ref={threadRef} className="mb-8 scroll-mt-28">
            <p className="font-heading text-sm font-semibold text-forest mb-3 uppercase tracking-wide flex items-center gap-2">
              Thread Colour
              {selectedThreadColour === null && (
                <span className="text-xs font-body font-normal text-charcoal/70 normal-case tracking-normal">
                  Choose one
                </span>
              )}
            </p>
            <div className="flex gap-2">
              {THREAD_COLOURS.map((colour) => (
                <button
                  key={colour.id}
                  type="button"
                  onClick={() => setSelectedThreadColour(colour.id)}
                  title={colour.label}
                  aria-label={colour.label}
                  aria-pressed={selectedThreadColour === colour.id}
                  className={`w-10 h-10 rounded-full border-2 ring-1 ring-charcoal/10 transition-all ${
                    selectedThreadColour === colour.id
                      ? 'border-forest scale-110'
                      : 'border-transparent hover:border-charcoal/40'
                  }`}
                  style={{ backgroundColor: colour.hex }}
                />
              ))}
            </div>
            {selectedThreadColour !== null && (
              <p className="text-xs text-charcoal/60 mt-2 font-body">
                {THREAD_COLOURS.find((c) => c.id === selectedThreadColour)?.label}
              </p>
            )}
          </div>
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
              onClick={handleAddToCart}
              disabled={!canAddToCart}
              className={`w-full min-h-14 font-heading font-semibold py-4 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-cream ${
                canAddToCart
                  ? 'bg-forest text-cream hover:bg-forest/90'
                  : 'bg-charcoal/10 text-charcoal/60 cursor-not-allowed'
              }`}
            >
              {canAddToCart ? `Add to cart · ₦${displayPrice.toLocaleString()}` : 'Choose a thread colour'}
            </button>
          )}
          <ul className="mt-4 grid gap-1.5 font-body text-xs text-charcoal/75">
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
            </p>
          </div>
          <button
            type="button"
            onClick={stickyAction}
            className="min-h-12 shrink-0 rounded-lg bg-forest px-5 font-heading text-sm font-semibold text-cream hover:bg-forest/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            {canAddToCart ? 'Add to cart' : product.material !== 'Tools' && selectedThreadColour === null ? 'Choose colour' : 'Choose options'}
          </button>
        </div>
      </div>
    </>
  )
}
