'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { Product } from '@/lib/types/product'
import { useCart } from '@/lib/cart/CartContext'
import { packFits } from '@/lib/stockDisplay'

/**
 * "Add loc shears" row under Add to cart on bead pages. One tap adds them
 * (the cart drawer opens as confirmation), instead of a separate card at the
 * bottom of the page that most shoppers never scrolled to.
 */
export function ShearsAddOn({ shears }: { shears: Product }) {
  const { dispatch } = useCart()
  const variant = shears.variants.find((v) => v.in_stock)
  if (!variant) return null
  const tier = variant.price_tiers[0]
  const qty = tier?.qty ?? 1
  const price = tier?.price ?? variant.price
  if (!packFits(variant, qty) || typeof price !== 'number') return null

  function add() {
    dispatch({
      type: 'ADD_ITEM',
      payload: {
        productId: shears.id,
        variantId: variant!.id,
        tierQty: qty,
        threadColour: '',
        productName: shears.name,
        variantName: variant!.name,
        unitPrice: price!,
        imageUrl: shears.image,
        isTool: true,
        quantity: 1,
      },
    })
  }

  return (
    <div className="mt-6 flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-forest/10">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-stone">
        <Image src={shears.image} alt="" fill sizes="56px" className="object-contain" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-heading text-sm font-semibold text-forest">Complete the kit</p>
        <p className="font-body text-xs text-charcoal/70">
          <Link href={`/catalog/${shears.slug}`} className="underline decoration-gold underline-offset-2 hover:text-forest">
            {shears.name}
          </Link>{' '}
          for trimming thread · ₦{price.toLocaleString('en-NG')}
        </p>
      </div>
      <button
        type="button"
        onClick={add}
        aria-label={`Add ${shears.name} to cart, ₦${price.toLocaleString('en-NG')}`}
        className="min-h-11 shrink-0 rounded-lg border-2 border-forest px-4 font-heading text-sm font-semibold text-forest transition-colors hover:bg-forest hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        Add
      </button>
    </div>
  )
}
