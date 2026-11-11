// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CartItem } from '@/lib/cart/types'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/checkout/shippingZones', () => ({
  getZoneIdForArea: vi.fn(() => null),
  getZoneById: vi.fn(() => undefined),
}))

vi.mock('@/components/checkout/PaystackButton', () => ({
  PaystackButton: ({ disabled }: { disabled: boolean }) => (
    <button disabled={disabled} data-testid="paystack-btn">
      Pay Now
    </button>
  ),
}))

import { OrderReview } from '@/components/checkout/OrderReview'
import { CartProvider } from '@/lib/cart/CartContext'
import type { CustomerDetails } from '@/components/checkout/CheckoutForm'

// ─── fixtures ─────────────────────────────────────────────────────────────────

const customerDetails: CustomerDetails = {
  firstName: 'Amara',
  lastName: 'Osei',
  email: 'amara@example.com',
  phone: '08012345678',
  deliveryAddress: '12 Lekki Road',
  state: 'Lagos',
  lga: undefined,
  deliveryType: 'nigeria',
}

const cartItems: CartItem[] = [
  {
    productId: 'prod-1',
    variantId: 'var-1',
    tierQty: 1,
    threadColour: 'gold',
    productName: 'Gold Bead',
    variantName: 'Small',
    unitPrice: 5000,
    imageUrl: '/bead.jpg',
    isTool: false,
    quantity: 2,
  },
]

// ─── fake network: each endpoint answered separately ─────────────────────────

type Line = { status: 'ok' | 'sold_out' | 'low_stock' | 'unavailable'; unitPrice: number | null; available: number | null }
const json = (data: unknown, ok = true, status = 200) => Promise.resolve({ ok, status, json: async () => data })
const never = () => new Promise(() => {})

let shipping: () => Promise<unknown>
let checkCart: () => Promise<unknown>
let promo: () => Promise<unknown>

const okLines = (): Line[] => cartItems.map((i) => ({ status: 'ok', unitPrice: i.unitPrice, available: null }))

const mockFetch = vi.fn((url: string) => {
  if (url.startsWith('/api/checkout/shipping-cost')) return shipping()
  if (url.startsWith('/api/checkout/check-cart')) return checkCart()
  if (url.startsWith('/api/checkout/validate-promo')) return promo()
  return Promise.reject(new Error('unexpected fetch ' + url))
})
vi.stubGlobal('fetch', mockFetch)

function renderOrderReview() {
  const onBack = vi.fn()
  const onPaymentSuccess = vi.fn()
  render(
    <CartProvider>
      <OrderReview items={cartItems} customerDetails={customerDetails} onBack={onBack} onPaymentSuccess={onPaymentSuccess} />
    </CartProvider>,
  )
  return { onBack, onPaymentSuccess }
}

const payButton = () => screen.getByTestId('paystack-btn') as HTMLButtonElement

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  shipping = () => json({ cost: 3000, deliveryTime: 'Same day' })
  checkCart = () => json({ lines: okLines() })
  promo = () => json({ valid: false, error: 'Invalid promo code' })
})

// ─── rendering ────────────────────────────────────────────────────────────────

describe('OrderReview — rendering', () => {
  it('renders the order items', () => {
    renderOrderReview()
    expect(screen.getByText(/Gold Bead/)).toBeDefined()
    expect(screen.getByText(/× 2/)).toBeDefined()
  })

  it('shows the subtotal correctly', () => {
    renderOrderReview()
    // 5000 × 2 = 10,000, shown on the line and the subtotal row
    expect(screen.getAllByText('₦10,000').length).toBeGreaterThanOrEqual(1)
  })

  it('shows "Loading…" while shipping is fetching', () => {
    shipping = never
    renderOrderReview()
    expect(screen.getByText('Loading…')).toBeDefined()
  })

  it('shows shipping cost after fetch resolves', async () => {
    renderOrderReview()
    await waitFor(() => expect(screen.getByText('₦3,000')).toBeDefined())
  })

  it('Pay button is disabled while shipping is loading', () => {
    shipping = never
    renderOrderReview()
    expect(payButton().disabled).toBe(true)
  })

  it('Pay button is enabled after shipping loads and the bag checks out', async () => {
    renderOrderReview()
    await waitFor(() => expect(payButton().disabled).toBe(false))
  })

  it('keeps Pay disabled if the delivery fee fails to load (never charges ₦0 delivery)', async () => {
    shipping = () => json({ error: 'boom' }, false, 500)
    renderOrderReview()
    await waitFor(() => expect(screen.getByText(/couldn.t load the delivery fee/i)).toBeDefined())
    expect(payButton().disabled).toBe(true)
  })

  it('renders promo code input', async () => {
    renderOrderReview()
    await waitFor(() => expect(screen.getByPlaceholderText('Promo code')).toBeDefined())
  })
})

// ─── stock + price check before payment ──────────────────────────────────────

describe('OrderReview — stock and price check', () => {
  it('blocks payment when an item has sold out', async () => {
    checkCart = () => json({ lines: [{ status: 'sold_out', unitPrice: null, available: 0 }] })
    renderOrderReview()
    await waitFor(() => expect(screen.getByText(/can.t be bought right now/)).toBeDefined())
    expect(screen.getByText(/sold out/)).toBeDefined()
    expect(payButton().disabled).toBe(true)
  })

  it('offers to reduce the quantity when only some packs are left', async () => {
    checkCart = () => json({ lines: [{ status: 'low_stock', unitPrice: 5000, available: 1 }] })
    renderOrderReview()
    await waitFor(() => expect(screen.getByText(/only 1 pack left/)).toBeDefined())
    expect(screen.getByRole('button', { name: 'Reduce to 1' })).toBeDefined()
    expect(payButton().disabled).toBe(true)
  })

  it('tells the customer when a price has changed', async () => {
    checkCart = () => json({ lines: [{ status: 'ok', unitPrice: 5500, available: null }] })
    renderOrderReview()
    await waitFor(() => expect(screen.getByText(/updated the price of Gold Bead/)).toBeDefined())
  })

  it('keeps Pay disabled and offers a retry when the stock check fails', async () => {
    checkCart = () => json({}, false, 500)
    renderOrderReview()
    await waitFor(() => expect(screen.getByText(/couldn.t confirm stock/)).toBeDefined())
    expect(payButton().disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Try again' })).toBeDefined()
  })
})

// ─── promo code: happy path ───────────────────────────────────────────────────

describe('OrderReview — promo code (free shipping)', () => {
  const freeShipping = () =>
    json({ valid: true, discountType: 'free_shipping', discountAmount: 0, shippingSaving: 3000, message: 'Free shipping applied!' })

  it('shows success message after applying a valid free-shipping code', async () => {
    const user = userEvent.setup()
    promo = freeShipping
    renderOrderReview()
    await waitFor(() => screen.getByText('₦3,000'))

    await user.type(screen.getByPlaceholderText('Promo code'), 'FREESHIP')
    await user.click(screen.getByRole('button', { name: /apply/i }))

    await waitFor(() => expect(screen.getByText('Free shipping applied!')).toBeDefined())
  })

  it('shows FREE label on the shipping line after free-shipping promo', async () => {
    const user = userEvent.setup()
    promo = freeShipping
    renderOrderReview()
    await waitFor(() => screen.getByText('₦3,000'))

    await user.type(screen.getByPlaceholderText('Promo code'), 'FREESHIP')
    await user.click(screen.getByRole('button', { name: /apply/i }))

    await waitFor(() => expect(screen.getByText('FREE')).toBeDefined())
  })
})

// ─── promo code: error path ───────────────────────────────────────────────────

describe('OrderReview — promo code (errors)', () => {
  it('shows error message for an invalid code', async () => {
    const user = userEvent.setup()
    renderOrderReview()
    await waitFor(() => screen.getByText('₦3,000'))

    await user.type(screen.getByPlaceholderText('Promo code'), 'BADCODE')
    await user.click(screen.getByRole('button', { name: /apply/i }))

    await waitFor(() => expect(screen.getByText('Invalid promo code')).toBeDefined())
  })

  it('shows error message for an expired code', async () => {
    const user = userEvent.setup()
    promo = () => json({ valid: false, error: 'This promo code has expired' })
    renderOrderReview()
    await waitFor(() => screen.getByText('₦3,000'))

    await user.type(screen.getByPlaceholderText('Promo code'), 'EXPIRED')
    await user.click(screen.getByRole('button', { name: /apply/i }))

    await waitFor(() => expect(screen.getByText('This promo code has expired')).toBeDefined())
  })

  it('Apply button is disabled before shipping loads', () => {
    shipping = never
    renderOrderReview()
    expect((screen.getByRole('button', { name: /apply/i }) as HTMLButtonElement).disabled).toBe(true)
  })
})

// ─── back button ──────────────────────────────────────────────────────────────

describe('OrderReview — back button', () => {
  it('calls onBack when the Back button is clicked', async () => {
    const user = userEvent.setup()
    const { onBack } = renderOrderReview()
    await user.click(screen.getByRole('button', { name: /^back$/i }))
    expect(onBack).toHaveBeenCalledOnce()
  })
})
