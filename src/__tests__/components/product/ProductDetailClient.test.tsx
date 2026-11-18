// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ComponentProps, ReactNode } from 'react'
import type { Product } from '@/lib/types/product'

vi.mock('@/lib/tracking/events', () => ({ trackEvent: vi.fn() }))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))
vi.mock('next/image', () => ({ default: () => null }))

import { trackEvent } from '@/lib/tracking/events'
import { CartProvider } from '@/lib/cart/CartContext'
import { ProductDetailClient } from '@/components/product/ProductDetailClient'

const gold: Product = {
  id: 'p-gold',
  name: 'Gold Twinkles',
  slug: 'gold-twinkles',
  description: '',
  image: '/gold.jpg',
  material: 'Gold',
  is_featured: true,
  price_min: 15885,
  price_max: 22805,
  created_at: '2026-01-01T00:00:00.000Z',
  variants: [
    { id: '4mm', name: '4mm', price: 18903, in_stock: true, price_tiers: [{ qty: 50, price: 18903 }, { qty: 100, price: 22774 }] },
    { id: '6mm', name: '6mm', price: 15885, in_stock: true, price_tiers: [{ qty: 25, price: 15885 }, { qty: 50, price: 22805 }] },
  ],
}

const shears: Product = {
  id: 'p-shears',
  name: 'Loc Shears',
  slug: 'shears',
  description: '',
  image: '/shears.jpg',
  material: 'Tools',
  is_featured: false,
  price_min: 3500,
  price_max: 3500,
  created_at: '2026-01-01T00:00:00.000Z',
  variants: [{ id: 'std', name: 'Standard', price: 3500, in_stock: true, price_tiers: [{ qty: 1, price: 3500 }] }],
}

function renderPage(props: Partial<ComponentProps<typeof ProductDetailClient>> = {}) {
  render(
    <CartProvider>
      <ProductDetailClient product={gold} descriptionHtml="" freeLagosOver={100000} lagosFrom={3000} otherDays="3-5 business days" {...props} />
    </CartProvider>,
  )
}

const mainAddButton = () => screen.getByRole('button', { name: /^Add to cart ·/ })

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('ProductDetailClient', () => {
  it('shows the delivery line under Add to cart, keeping the free delivery line', () => {
    renderPage()
    expect(screen.getByText(/Lagos from ₦3,000, same day in most areas · Nationwide 3-5 business days/)).toBeInTheDocument()
    expect(screen.getByText('Free Lagos delivery on orders over ₦100,000')).toBeInTheDocument()
  })

  it('falls back to the generic delivery note without shipping figures', () => {
    renderPage({ lagosFrom: undefined, otherDays: undefined })
    expect(screen.getByText(/Delivery across Lagos and nationwide/)).toBeInTheDocument()
  })

  it('updates the price when the pack size or bead size changes', () => {
    renderPage()
    expect(mainAddButton()).toHaveTextContent('₦18,903')
    fireEvent.click(screen.getByRole('button', { name: '100 beads' }))
    expect(mainAddButton()).toHaveTextContent('₦22,774')
    fireEvent.click(screen.getByRole('button', { name: '6mm' }))
    expect(mainAddButton()).toHaveTextContent('₦15,885')
  })

  it('preselects a thread colour so Add to cart is never blocked', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /Black/, pressed: true })).toBeInTheDocument()
    expect(mainAddButton()).toBeEnabled()
  })

  it('fires AddToCart with the product, the selected pack price and quantity', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: '100 beads' }))
    fireEvent.click(mainAddButton())
    expect(trackEvent).toHaveBeenCalledWith({ name: 'AddToCart', contentIds: ['p-gold'], contentName: 'Gold Twinkles', value: 22774, quantity: 1 })
  })

  it('fires AddToCart for the shears add-on', () => {
    renderPage({ addOn: shears })
    fireEvent.click(screen.getByRole('button', { name: 'Add Loc Shears to cart, ₦3,500' }))
    expect(trackEvent).toHaveBeenCalledWith({ name: 'AddToCart', contentIds: ['p-shears'], contentName: 'Loc Shears', value: 3500, quantity: 1 })
  })
})
