// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { trackEvent } = vi.hoisted(() => ({ trackEvent: vi.fn() }))
vi.mock('@/lib/tracking/events', () => ({ trackEvent }))
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

import { SizeGuideButton, SizeGuideProvider } from '@/components/landing/SizeGuide'
import { DEFAULT_LANDING_CONFIG } from '@/lib/landing/config'

const guide = {
  ...DEFAULT_LANDING_CONFIG.sizeGuide,
  photos: { '2mm': { url: '/2mm.jpg', alt: '2mm bead on a micro loc' }, '4mm': null, '6mm': null },
}

describe('Size guide', () => {
  it('opens as a dialog, closes on Escape and gives focus back to the button that opened it', async () => {
    const user = userEvent.setup()
    render(
      <SizeGuideProvider guide={guide}>
        <SizeGuideButton>Open the size guide</SizeGuideButton>
      </SizeGuideProvider>,
    )
    const trigger = screen.getByRole('button', { name: 'Open the size guide' })
    await user.click(trigger)

    const dialog = await screen.findByRole('dialog', { name: 'Find your size' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByAltText('2mm bead on a micro loc')).toBeInTheDocument()
    expect(screen.getAllByText('4mm bead on a loc')).toHaveLength(1) // missing photo: highlighted placeholder
    expect(screen.getByText('For most medium locs.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Close size guide' })).toHaveFocus())

    const wa = screen.getByRole('link', { name: /Send us a photo on WhatsApp/ })
    expect(decodeURIComponent(wa.getAttribute('href')!)).toContain("I came from your ad. Can you help me pick a bead size? Here's a photo of my locs.")

    await user.keyboard('{Escape}')
    await waitFor(() => expect(trigger).toHaveFocus())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes on a backdrop tap', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <SizeGuideProvider guide={guide}>
        <SizeGuideButton>Which size?</SizeGuideButton>
      </SizeGuideProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Which size?' }))
    await screen.findByRole('dialog')
    await user.click(container.ownerDocument.querySelector('.fixed.inset-0 > [aria-hidden="true"]')!)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
