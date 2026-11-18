// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ProductVariant } from '@/lib/types/product'

const { dispatch, trackEvent } = vi.hoisted(() => ({ dispatch: vi.fn(), trackEvent: vi.fn() }))

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))
vi.mock('@/lib/cart/CartContext', () => ({
  useCart: () => ({ state: { items: [], isDrawerOpen: false, hydrated: true }, dispatch }),
}))
vi.mock('@/lib/tracking/events', () => ({ trackEvent }))

import { ProductCard, type CardProduct } from '@/components/landing/ProductCard'

const variants = (): ProductVariant[] => [
  { id: 'v2', name: '2mm', price: 21215, in_stock: false, price_tiers: [{ qty: 50, price: 21215 }] },
  {
    id: 'v4',
    name: '4mm',
    price: 13590,
    in_stock: true,
    stock: 730, // 14 packs of 50, 7 of 100; not enough for 1,000
    price_tiers: [
      { qty: 50, price: 13590 },
      { qty: 100, price: 18903 },
      { qty: 1000, price: 99000 },
    ],
  },
  { id: 'v6', name: '6mm', price: 15885, in_stock: true, price_tiers: [{ qty: 25, price: 15885 }, { qty: 50, price: 22804 }] },
]

const product = (over: Partial<CardProduct> = {}): CardProduct => ({
  id: 'prod-gold',
  slug: 'gold-twinkles',
  name: 'Gold Twinkles',
  cartName: 'Gold Twinkles ✨',
  tagline: 'Warm gold that goes with everything',
  material: 'Gold',
  image: '/img/gold.jpg',
  images: ['/img/gold.jpg', '/img/gold-2.jpg'],
  variants: variants(),
  price_min: 13590,
  ...over,
})

const renderCard = (over: Partial<CardProduct> = {}, stockWarningAt = 10) =>
  render(<ProductCard product={product(over)} initial={{ variantId: 'v4', tierQty: 50, thread: 'black' }} stockWarningAt={stockWarningAt} />)

/** The live price line as a screen reader hears it (the visible " · " separators are hidden from it) */
const spokenPrice = (price: string) => {
  const live = screen.getByText(price, { exact: false }).closest('[aria-live]') as HTMLElement
  const clone = live.cloneNode(true) as HTMLElement
  clone.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove())
  return clone.textContent
}

beforeEach(() => {
  dispatch.mockReset()
  trackEvent.mockReset()
})
afterEach(() => vi.useRealTimers())

describe('ProductCard', () => {
  it('shows the real price of the preselected options, and nothing per bead for the smallest pack', () => {
    renderCard()
    expect(screen.getByRole('heading', { name: 'Gold Twinkles' })).toBeInTheDocument()
    expect(spokenPrice('₦13,590')).toBe('₦13,590, 4mm, pack of 50')
    expect(screen.queryByText(/per bead/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '4mm' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '50 beads' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Black' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('updates the price and per-bead price when a pack is chosen, and tracks it', async () => {
    const user = userEvent.setup()
    renderCard()
    await user.click(screen.getByRole('button', { name: '100 beads' }))
    expect(screen.getByText('₦18,903', { exact: false }).closest('[aria-live]')).toHaveAttribute('aria-live', 'polite')
    expect(spokenPrice('₦18,903')).toBe('₦18,903, 4mm, pack of 100₦189 per bead')
    expect(screen.getByText('₦189 per bead')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '100 beads' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '50 beads' })).toHaveAttribute('aria-pressed', 'false')
    expect(trackEvent).toHaveBeenCalledWith({ name: 'SelectVariant', productId: 'prod-gold', size: '4mm', pack: 100, thread: 'black' })
  })

  it('changing size keeps the pack when that size has it, else picks its first pack', async () => {
    const user = userEvent.setup()
    renderCard()
    await user.click(screen.getByRole('button', { name: '6mm' }))
    expect(screen.getByText('₦22,804', { exact: false })).toBeInTheDocument() // 6mm, pack of 50
    await user.click(screen.getByRole('button', { name: '25 beads' }))
    await user.click(screen.getByRole('button', { name: '4mm' }))
    expect(screen.getByText('₦13,590', { exact: false })).toBeInTheDocument() // 4mm has no 25: first pack, 50
    expect(trackEvent).toHaveBeenLastCalledWith({ name: 'SelectVariant', productId: 'prod-gold', size: '4mm', pack: 50, thread: 'black' })
  })

  it('disables sizes that are out of stock and packs that no longer fit', () => {
    renderCard()
    expect(screen.getByRole('button', { name: '2mm (out of stock)' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '1000 beads, not enough left' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '100 beads' })).toBeEnabled()
  })

  it('thread swatches show their names and switch with the keyboard', async () => {
    const user = userEvent.setup()
    renderCard()
    const blonde = screen.getByRole('button', { name: 'Blonde' })
    blonde.focus()
    await user.keyboard('{Enter}')
    expect(blonde).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Thread colour:', { exact: false })).toHaveTextContent('Thread colour: Blonde')
  })

  it('adds the exact selection to the store’s cart with the product page’s payload, then says Added for 2 s', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderCard()
    await user.click(screen.getByRole('button', { name: '100 beads' }))
    await user.click(screen.getByRole('button', { name: 'Light Brown' }))
    await user.click(screen.getByRole('button', { name: 'Add to cart' }))

    expect(dispatch).toHaveBeenCalledWith({
      type: 'ADD_ITEM',
      payload: {
        productId: 'prod-gold',
        variantId: 'v4',
        tierQty: 100,
        threadColour: 'light-brown',
        productName: 'Gold Twinkles ✨',
        variantName: '4mm',
        unitPrice: 18903,
        imageUrl: '/img/gold.jpg',
        isTool: false,
        quantity: 1,
      },
    })
    expect(trackEvent).toHaveBeenCalledWith({ name: 'AddToCart', contentIds: ['prod-gold'], contentName: 'Gold Twinkles', value: 18903, quantity: 1 })
    expect(screen.getByRole('button', { name: 'Added ✓' })).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.getByRole('button', { name: 'Add to cart' })).toBeInTheDocument()
  })

  it('shows "Only N packs left" only for tracked stock at or under the warning level', async () => {
    const user = userEvent.setup()
    renderCard({}, 10)
    expect(screen.queryByText(/packs? left/)).not.toBeInTheDocument() // 14 packs of 50
    await user.click(screen.getByRole('button', { name: '100 beads' }))
    expect(screen.getByText('Only 7 packs left')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '6mm' }))
    expect(screen.queryByText(/packs? left/)).not.toBeInTheDocument() // 6mm isn't tracked
  })

  it('a sold-out product can’t be added', () => {
    renderCard({ variants: variants().map((v) => ({ ...v, in_stock: false })) })
    expect(screen.getByRole('button', { name: 'Sold out for now' })).toBeDisabled()
  })

  it('has visible previous/next photo buttons', async () => {
    renderCard()
    expect(screen.getByRole('button', { name: 'Previous photo' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next photo' })).toBeInTheDocument()
    expect(screen.getByAltText('Gold Twinkles loc beads')).toBeInTheDocument()
  })
})
