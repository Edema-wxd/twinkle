'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/lib/cart/CartContext'
import { BagIcon } from './icons'

/**
 * The landing page's reduced header: logo (to the shop) and cart only, no menu,
 * so the only ways on are buying, WhatsApp or the logo. The cart opens the store's
 * own drawer.
 */
export function LpHeader() {
  const { state, dispatch } = useCart()
  const totalItems = state.items.reduce((sum, i) => sum + i.quantity, 0)
  const badge = totalItems > 9 ? '9+' : String(totalItems)

  return (
    <header className="sticky top-0 z-30 border-b border-cream/10 bg-forest shadow-sm">
      <div className="mx-auto flex h-14 w-full max-w-[1120px] items-center justify-between px-4 md:h-16 md:px-8">
        <Link href="/" aria-label="Twinkle Locs shop" className="-ml-1 rounded-md p-1 focus-visible:outline-2 focus-visible:outline-cream">
          <Image
            src="https://ta1u3ge9om.ufs.sh/f/fBUPGtLq5gOYxli6v2v9bkGFeW9BCV3IvLqNKgMpAozSZDXJ"
            alt="Twinkle Locs"
            width={150}
            height={50}
            loading="eager"
            className="h-10 w-auto md:h-12"
          />
        </Link>
        <button
          type="button"
          onClick={() => dispatch({ type: 'OPEN_DRAWER' })}
          aria-label={`Open cart${totalItems > 0 ? `, ${totalItems} item${totalItems === 1 ? '' : 's'}` : ''}`}
          className="relative -mr-2 flex h-11 w-11 items-center justify-center rounded-full text-cream transition-colors hover:bg-cream/10 focus-visible:outline-2 focus-visible:outline-cream"
        >
          <BagIcon />
          {totalItems > 0 && (
            <span
              aria-hidden="true"
              className="absolute right-0.5 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gold-light px-1 font-heading text-[11px] font-bold text-forest"
            >
              {badge}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
