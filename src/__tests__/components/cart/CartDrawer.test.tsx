// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { MouseEvent, ReactNode } from 'react'
import type { CartItem } from '@/lib/cart/types'

vi.mock('@/lib/tracking/events', () => ({ trackEvent: vi.fn() }))
// Plain link that runs the component's click handler but doesn't navigate (jsdom can't)
vi.mock('next/link', () => ({
  default: ({ href, children, onClick, ...rest }: { href: string; children: ReactNode; onClick?: (e: MouseEvent<HTMLAnchorElement>) => void }) => (
    <a
      href={href}
      onClick={(e) => {
        onClick?.(e)
        e.preventDefault()
      }}
      {...rest}
    >
      {children}
    </a>
  ),
}))
vi.mock('next/image', () => ({ default: () => null }))

import { trackEvent } from '@/lib/tracking/events'
import { CartProvider } from '@/lib/cart/CartContext'
import { CartDrawer } from '@/components/cart/CartDrawer'
import CartPage from '@/app/cart/page'
import { resetCartDeliveryInfo } from '@/components/cart/deliveryInfo'

const items: CartItem[] = [
  { productId: 'p-gold', variantId: '4mm', tierQty: 50, threadColour: 'black', productName: 'Gold Twinkles', variantName: '4mm', unitPrice: 18903, imageUrl: '/gold.jpg', isTool: false, quantity: 2 },
  { productId: 'p-shears', variantId: 'std', tierQty: 1, threadColour: '', productName: 'Shears', variantName: 'Standard', unitPrice: 3500, imageUrl: '/shears.jpg', isTool: true, quantity: 1 },
]
const subtotal = 18903 * 2 + 3500

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

function respond(body: unknown, ok = true) {
  fetchMock.mockResolvedValue({ ok, json: async () => body })
}

beforeEach(() => {
  vi.clearAllMocks()
  resetCartDeliveryInfo()
  localStorage.clear()
  localStorage.setItem('twinkle_cart', JSON.stringify(items))
  respond({ freeLagosOver: 100000, lagosFrom: 3000 })
})

describe('CartDrawer', () => {
  it('shows the cheapest Lagos delivery fee from Admin → Shipping', async () => {
    render(<CartProvider><CartDrawer /></CartProvider>)
    expect(await screen.findByText('Delivery: from ₦3,000 in Lagos, shown before you pay')).toBeInTheDocument()
    expect(screen.queryByText(/Shipping calculated at checkout/)).not.toBeInTheDocument()
  })

  it('keeps the free delivery nudge, sharing one request with the delivery line', async () => {
    render(<CartProvider><CartDrawer /></CartProvider>)
    expect(await screen.findByText(/away from free Lagos delivery/)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/checkout/free-delivery')
  })

  it('falls back to a plain note when the delivery figures cannot be loaded', async () => {
    respond({}, false)
    render(<CartProvider><CartDrawer /></CartProvider>)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(screen.getByText('Delivery fee shown before you pay')).toBeInTheDocument()
  })

  it('fires InitiateCheckout with the subtotal and item count when Checkout is clicked', async () => {
    render(<CartProvider><CartDrawer /></CartProvider>)
    const checkout = await screen.findByRole('link', { name: 'Checkout', hidden: true })
    fireEvent.click(checkout)
    expect(trackEvent).toHaveBeenCalledWith({ name: 'InitiateCheckout', value: subtotal, numItems: 3 })
  })
})

describe('Cart page', () => {
  it('fires InitiateCheckout and shows the delivery line', async () => {
    render(<CartProvider><CartPage /></CartProvider>)
    expect(await screen.findByText('Delivery: from ₦3,000 in Lagos, shown before you pay')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Checkout' }))
    expect(trackEvent).toHaveBeenCalledWith({ name: 'InitiateCheckout', value: subtotal, numItems: 3 })
  })
})
