// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { OrderReview } from '@/components/checkout/OrderReview'
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

function shippingResponse(cost: number) {
  return {
    ok: true,
    json: async () => ({ cost }),
  }
}

function promoResponse(data: object) {
  return {
    ok: true,
    json: async () => data,
  }
}

function renderOrderReview() {
  const onBack = vi.fn()
  const onPaymentSuccess = vi.fn()
  render(
    <OrderReview
      items={cartItems}
      customerDetails={customerDetails}
      onBack={onBack}
      onPaymentSuccess={onPaymentSuccess}
    />
  )
  return { onBack, onPaymentSuccess }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockFetch.mockResolvedValue(shippingResponse(3000))
})

// ─── rendering ────────────────────────────────────────────────────────────────

describe('OrderReview — rendering', () => {
  it('renders the order items', async () => {
    renderOrderReview()
    expect(screen.getByText(/Gold Bead/)).toBeDefined()
    expect(screen.getByText(/× 2/)).toBeDefined()
  })

  it('shows the subtotal correctly', async () => {
    renderOrderReview()
    // 5000 × 2 = 10,000 — appears in line total, subtotal row, and total row
    const matches = screen.getAllByText('₦10,000')
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('shows "Loading…" while shipping is fetching', () => {
    // Don't resolve fetch yet
    mockFetch.mockReturnValue(new Promise(() => {}))
    renderOrderReview()
    expect(screen.getByText('Loading…')).toBeDefined()
  })

  it('shows shipping cost after fetch resolves', async () => {
    renderOrderReview()
    await waitFor(() => {
      expect(screen.getByText('₦3,000')).toBeDefined()
    })
  })

  it('Pay button is disabled while shipping is loading', () => {
    mockFetch.mockReturnValue(new Promise(() => {}))
    renderOrderReview()
    const btn = screen.getByTestId('paystack-btn') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('Pay button is enabled after shipping loads', async () => {
    renderOrderReview()
    await waitFor(() => {
      const btn = screen.getByTestId('paystack-btn') as HTMLButtonElement
      expect(btn.disabled).toBe(false)
    })
  })

  it('renders promo code input', async () => {
    renderOrderReview()
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Promo code')).toBeDefined()
    })
  })
})

// ─── promo code — happy path ──────────────────────────────────────────────────

describe('OrderReview — promo code (free shipping)', () => {
  it('shows success message after applying a valid free-shipping code', async () => {
    const user = userEvent.setup()
    renderOrderReview()

    // Wait for shipping to load
    await waitFor(() => screen.getByText('₦3,000'))

    // Mock promo API for next fetch call
    mockFetch.mockResolvedValueOnce(
      promoResponse({
        valid: true,
        discountType: 'free_shipping',
        discountAmount: 0,
        shippingSaving: 3000,
        message: 'Free shipping applied!',
      })
    )

    await user.type(screen.getByPlaceholderText('Promo code'), 'FREESHIP')
    await user.click(screen.getByRole('button', { name: /apply/i }))

    await waitFor(() => {
      expect(screen.getByText('Free shipping applied!')).toBeDefined()
    })
  })

  it('shows FREE label on the shipping line after free-shipping promo', async () => {
    const user = userEvent.setup()
    renderOrderReview()
    await waitFor(() => screen.getByText('₦3,000'))

    mockFetch.mockResolvedValueOnce(
      promoResponse({
        valid: true,
        discountType: 'free_shipping',
        discountAmount: 0,
        shippingSaving: 3000,
        message: 'Free shipping applied!',
      })
    )

    await user.type(screen.getByPlaceholderText('Promo code'), 'FREESHIP')
    await user.click(screen.getByRole('button', { name: /apply/i }))

    await waitFor(() => {
      expect(screen.getByText('FREE')).toBeDefined()
    })
  })
})

// ─── promo code — error path ──────────────────────────────────────────────────

describe('OrderReview — promo code (errors)', () => {
  it('shows error message for an invalid code', async () => {
    const user = userEvent.setup()
    renderOrderReview()
    await waitFor(() => screen.getByText('₦3,000'))

    mockFetch.mockResolvedValueOnce(
      promoResponse({ valid: false, error: 'Invalid promo code' })
    )

    await user.type(screen.getByPlaceholderText('Promo code'), 'BADCODE')
    await user.click(screen.getByRole('button', { name: /apply/i }))

    await waitFor(() => {
      expect(screen.getByText('Invalid promo code')).toBeDefined()
    })
  })

  it('shows error message for an expired code', async () => {
    const user = userEvent.setup()
    renderOrderReview()
    await waitFor(() => screen.getByText('₦3,000'))

    mockFetch.mockResolvedValueOnce(
      promoResponse({ valid: false, error: 'This promo code has expired' })
    )

    await user.type(screen.getByPlaceholderText('Promo code'), 'EXPIRED')
    await user.click(screen.getByRole('button', { name: /apply/i }))

    await waitFor(() => {
      expect(screen.getByText('This promo code has expired')).toBeDefined()
    })
  })

  it('Apply button is disabled before shipping loads', async () => {
    mockFetch.mockReturnValue(new Promise(() => {})) // never resolves
    renderOrderReview()
    const applyBtn = screen.getByRole('button', { name: /apply/i })
    expect((applyBtn as HTMLButtonElement).disabled).toBe(true)
  })
})

// ─── back button ──────────────────────────────────────────────────────────────

describe('OrderReview — back button', () => {
  it('calls onBack when the Back button is clicked', async () => {
    const user = userEvent.setup()
    const { onBack } = renderOrderReview()
    await user.click(screen.getByRole('button', { name: /back/i }))
    expect(onBack).toHaveBeenCalledOnce()
  })
})
