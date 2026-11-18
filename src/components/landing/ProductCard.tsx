'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Image from 'next/image'
import { useCart } from '@/lib/cart/CartContext'
import { THREAD_COLOURS } from '@/lib/cart/threadColours'
import { firstFittingTier, packFits } from '@/lib/stockDisplay'
import { trackEvent } from '@/lib/tracking/events'
import { canOptimise } from '@/lib/landing/images'
import type { LandingProduct } from '@/lib/landing/data'
import { formatNaira, formatPerBead, packsLeft, perBeadPrice, selectionPrice, tierFits, type Selection } from '@/lib/landing/selection'
import { Carousel } from './Carousel'
import { Copy, DisplayText } from './Copy'
import { useSizeGuide } from './SizeGuide'
import { CheckIcon } from './icons'

export type CardProduct = Pick<
  LandingProduct,
  'id' | 'slug' | 'name' | 'cartName' | 'tagline' | 'material' | 'image' | 'images' | 'variants' | 'price_min'
>

type Props = {
  product: CardProduct
  /** Preselected options, resolved on the server */
  initial: Selection
  /** "Only N packs left" at or under this many packs (tracked stock only) */
  stockWarningAt: number
}

const chip =
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border-2 px-3 font-heading text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest disabled:cursor-not-allowed disabled:border-charcoal/10 disabled:bg-transparent disabled:text-charcoal/45 disabled:line-through'
const chipOn = 'border-gold bg-gold-light text-forest'
const chipOff = 'border-charcoal/20 bg-white text-charcoal hover:border-gold'
const groupLabel = 'mb-2 font-heading text-[13px] font-semibold uppercase tracking-[0.12em] text-forest'

/**
 * A Best-sellers card: photos, live price for the chosen size, pack and thread,
 * and Add to cart through the store's own cart (same payload as the product page,
 * so the drawer and checkout behave identically).
 */
export function ProductCard({ product, initial, stockWarningAt }: Props) {
  const { dispatch } = useCart()
  const { open: openSizeGuide } = useSizeGuide()
  const [sel, setSel] = useState<Selection>(initial)
  const [justAdded, setJustAdded] = useState(false)
  const addedTimer = useRef<number | undefined>(undefined)
  const uid = useId()
  useEffect(() => () => window.clearTimeout(addedTimer.current), [])

  const isTool = product.material === 'Tools'
  const variant = product.variants.find((v) => v.id === sel.variantId)
  const price = selectionPrice(product, sel)
  const perBead = isTool ? null : perBeadPrice(variant, sel.tierQty)
  const left = packsLeft(variant, sel.tierQty)
  const showLow = left !== null && left > 0 && left <= stockWarningAt
  const soldOut = !product.variants.some((v) => v.in_stock)
  const canAdd = packFits(variant, sel.tierQty)
  const tiers = variant?.price_tiers ?? []
  const threadLabel = THREAD_COLOURS.find((c) => c.id === sel.thread)?.label

  function choose(next: Selection) {
    if (next.variantId === sel.variantId && next.tierQty === sel.tierQty && next.thread === sel.thread) return
    setSel(next)
    const v = product.variants.find((x) => x.id === next.variantId)
    trackEvent({ name: 'SelectVariant', productId: product.id, size: v?.name ?? '', pack: next.tierQty, thread: next.thread || undefined })
  }

  function chooseSize(variantId: string) {
    const v = product.variants.find((x) => x.id === variantId)
    // Keep the pack size when the new bead size has it, so prices compare like for like
    choose({ ...sel, variantId, tierQty: tierFits(v, sel.tierQty) ? sel.tierQty : firstFittingTier(v) })
  }

  function addToCart() {
    if (!canAdd) return
    dispatch({
      type: 'ADD_ITEM',
      payload: {
        productId: product.id,
        variantId: sel.variantId,
        tierQty: sel.tierQty,
        threadColour: isTool ? '' : sel.thread,
        productName: product.cartName,
        variantName: variant?.name ?? '',
        unitPrice: price,
        imageUrl: product.image,
        isTool,
        quantity: 1,
      },
    })
    trackEvent({ name: 'AddToCart', contentIds: [product.id], contentName: product.name, value: price, quantity: 1 })
    setJustAdded(true)
    window.clearTimeout(addedTimer.current)
    addedTimer.current = window.setTimeout(() => setJustAdded(false), 2000)
  }

  const priceParts = [formatNaira(price)]
  if (variant && (product.variants.length > 1 || !isTool)) priceParts.push(variant.name)
  if (!isTool && sel.tierQty > 0) priceParts.push(`pack of ${sel.tierQty}`)

  return (
    <article id={`product-${product.slug}`} aria-labelledby={`${uid}-name`} className="flex scroll-mt-20 flex-col overflow-hidden rounded-3xl bg-white shadow-[0_1px_2px_rgba(26,60,52,0.06),0_12px_32px_-12px_rgba(26,60,52,0.18)] ring-1 ring-forest/10">
      <div className="relative bg-stone">
        <Carousel label={`${product.name} photos`} noun="photo" slideClassName="w-full" controls="overlay">
          {product.images.map((src, i) => (
            <div key={src + i} className="relative aspect-square">
              <Image
                src={src}
                alt={i === 0 ? `${product.name} loc beads` : `${product.name} loc beads, photo ${i + 1} of ${product.images.length}`}
                fill
                sizes="(min-width: 1024px) 336px, (min-width: 480px) 448px, calc(100vw - 32px)"
                unoptimized={!canOptimise(src)}
                className="object-cover"
              />
            </div>
          ))}
        </Carousel>
      </div>

      <div className="flex flex-1 flex-col p-5 md:p-6">
        <h3 id={`${uid}-name`} className="font-display text-2xl leading-[1.3] text-forest">
          <DisplayText text={product.name} />
        </h3>
        {product.tagline && (
          <p className="mt-1 font-body text-base leading-normal text-charcoal/80">
            <Copy text={product.tagline} />
          </p>
        )}

        {/* Live price: announced politely when it changes */}
        <div aria-live="polite" aria-atomic="true" className="mt-4 min-h-[3.25rem]">
          <p className="font-heading text-xl font-bold text-forest">
            {priceParts.map((part, i) => (
              <span key={i} className={i === 0 ? '' : 'font-semibold text-charcoal/80'}>
                {i > 0 && <span aria-hidden="true"> · </span>}
                {i > 0 && <span className="sr-only">, </span>}
                {part}
              </span>
            ))}
          </p>
          {perBead !== null && <p className="mt-0.5 font-body text-[13px] font-medium text-charcoal/80">{formatPerBead(perBead)} per bead</p>}
        </div>

        {!soldOut && (
          <div className="mt-4 space-y-4">
            {product.variants.length > 1 && (
              <div role="group" aria-labelledby={`${uid}-size`}>
                <div className="flex items-baseline justify-between gap-3">
                  <p id={`${uid}-size`} className={groupLabel}>
                    Bead size
                  </p>
                  {!isTool && (
                    <button
                      type="button"
                      onClick={openSizeGuide}
                      aria-haspopup="dialog"
                      className="-my-2 min-h-11 px-1 font-body text-sm font-semibold text-forest underline decoration-gold decoration-2 underline-offset-4 hover:text-charcoal focus-visible:outline-2 focus-visible:outline-forest"
                    >
                      Which size?
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => {
                    const on = v.id === sel.variantId
                    return (
                      <button
                        key={v.id}
                        type="button"
                        aria-pressed={on}
                        disabled={!v.in_stock}
                        aria-label={v.in_stock ? undefined : `${v.name} (out of stock)`}
                        onClick={() => chooseSize(v.id)}
                        className={`${chip} ${on ? chipOn : chipOff}`}
                      >
                        {v.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            {product.variants.length <= 1 && !isTool && (
              <button
                type="button"
                onClick={openSizeGuide}
                aria-haspopup="dialog"
                className="-my-2 min-h-11 px-0 font-body text-sm font-semibold text-forest underline decoration-gold decoration-2 underline-offset-4 hover:text-charcoal"
              >
                Which size?
              </button>
            )}

            {tiers.length > 1 && (
              <div role="group" aria-labelledby={`${uid}-pack`}>
                <p id={`${uid}-pack`} className={groupLabel}>
                  Pack size <span className="font-body font-medium normal-case tracking-normal text-charcoal/80">(beads)</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {tiers.map((t) => {
                    const on = t.qty === sel.tierQty
                    const fits = packFits(variant, t.qty)
                    return (
                      <button
                        key={t.qty}
                        type="button"
                        aria-pressed={on}
                        disabled={!fits}
                        aria-label={`${t.qty} beads${fits ? '' : ', not enough left'}`}
                        onClick={() => choose({ ...sel, tierQty: t.qty })}
                        className={`${chip} min-w-14 ${on ? chipOn : chipOff}`}
                      >
                        {t.qty}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {!isTool && (
              <div role="group" aria-labelledby={`${uid}-thread`}>
                <p id={`${uid}-thread`} className={groupLabel}>
                  Thread colour: <span className="font-body font-medium normal-case tracking-normal text-charcoal">{threadLabel}</span>
                </p>
                <div className="grid grid-cols-5 gap-1">
                  {THREAD_COLOURS.map((c) => {
                    const on = c.id === sel.thread
                    return (
                      <button
                        key={c.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => choose({ ...sel, thread: c.id })}
                        className="group flex min-h-11 flex-col items-center gap-1 rounded-lg py-1 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-forest"
                      >
                        <span
                          aria-hidden="true"
                          className={`flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-charcoal/20 transition-shadow ${
                            on ? 'outline-[3px] outline-offset-2 outline-gold outline-solid' : 'group-hover:outline-2 group-hover:outline-offset-2 group-hover:outline-charcoal/25 group-hover:outline-solid'
                          }`}
                          style={{ backgroundColor: c.hex }}
                        >
                          {on && <CheckIcon className={`h-4 w-4 ${c.id === 'blonde' ? 'text-charcoal' : 'text-white'}`} />}
                        </span>
                        <span className={`text-center font-body text-[13px] leading-tight ${on ? 'font-semibold text-forest' : 'text-charcoal/80'}`}>{c.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-auto pt-5">
          {showLow && (
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 font-body text-[13px] font-semibold text-amber-900 ring-1 ring-amber-200">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-600" />
              {isTool ? `Only ${left} left` : `Only ${left} ${left === 1 ? 'pack' : 'packs'} left`}
            </p>
          )}
          <button
            type="button"
            onClick={addToCart}
            disabled={!canAdd}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold-light px-6 font-heading text-base font-bold text-forest shadow-sm transition-colors hover:bg-[#D8BC86] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest disabled:cursor-not-allowed disabled:bg-charcoal/10 disabled:text-charcoal/60 disabled:shadow-none"
          >
            {soldOut ? 'Sold out for now' : !canAdd ? 'Not enough left in this size' : justAdded ? 'Added ✓' : 'Add to cart'}
          </button>
          <span className="sr-only" aria-live="polite">
            {justAdded ? `${product.name} added to your cart` : ''}
          </span>
        </div>
      </div>
    </article>
  )
}
