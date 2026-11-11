// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StarRating, summariseRatings } from '@/components/product/StarRating'

describe('summariseRatings', () => {
  it('averages ratings and counts them', () => {
    expect(summariseRatings([5, 5, 4, 4])).toEqual({ average: 4.5, count: 4 })
  })
  it('is zero with no reviews', () => {
    expect(summariseRatings([])).toEqual({ average: 0, count: 0 })
  })
})

describe('StarRating', () => {
  it('reads as a rating, not five star characters', () => {
    render(<StarRating value={4.25} />)
    expect(screen.getByRole('img', { name: 'Rated 4.3 out of 5' })).toBeDefined()
  })
  it('fills stars in proportion to the rating', () => {
    const { container } = render(<StarRating value={4} />)
    const fill = container.querySelectorAll('span[aria-hidden="true"]')[1] as HTMLElement
    expect(fill.style.width).toBe('80%')
  })
})
