// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// The Paystack popup reports a reference of its own; we must go to the order under ours.
const { newTransaction } = vi.hoisted(() => ({ newTransaction: vi.fn() }))
vi.mock('@paystack/inline-js', () => ({
  default: class {
    newTransaction = newTransaction
  },
}))

import { PaystackButton } from '@/components/checkout/PaystackButton'

describe('PaystackButton', () => {
  it('reports our own reference on success, even when the popup gives another', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    newTransaction.mockImplementation((opts: { reference: string; onSuccess: (t: { reference: string }) => void }) => {
      expect(opts.reference).toBe('tw-1794920885507-k6t1h')
      opts.onSuccess({ reference: 'T6773068772I1311053SZKZVM' })
    })
    const onSuccess = vi.fn()
    render(
      <PaystackButton
        config={{ email: 'f@example.com', amountKobo: 650000, reference: 'tw-1794920885507-k6t1h', metadata: {} }}
        onSuccess={onSuccess}
        onClose={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Pay ₦6,500/ }))
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('tw-1794920885507-k6t1h'))
  })
})
