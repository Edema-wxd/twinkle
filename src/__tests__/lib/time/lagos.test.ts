import { describe, it, expect } from 'vitest'
import { periodStarts } from '@/lib/time/lagos'

describe('periodStarts (Lagos, UTC+1)', () => {
  it('starts "today" at Lagos midnight, i.e. 23:00 UTC the day before', () => {
    // Wednesday 12 Nov 2026, 00:30 in Lagos = 23:30 UTC on Tuesday
    const { today } = periodStarts(new Date('2026-11-11T23:30:00Z'))
    expect(today.toISOString()).toBe('2026-11-11T23:00:00.000Z')
  })

  it('counts an order at 00:30 Lagos time as today, not yesterday', () => {
    const order = new Date('2026-11-11T23:30:00Z')
    const { today } = periodStarts(new Date('2026-11-12T10:00:00Z'))
    expect(order >= today).toBe(true)
  })

  it('starts the week on Monday', () => {
    // Thursday 12 Nov 2026 → Monday 9 Nov, 00:00 Lagos
    expect(periodStarts(new Date('2026-11-12T10:00:00Z')).week.toISOString()).toBe('2026-11-08T23:00:00.000Z')
    // On a Sunday the week began six days earlier
    expect(periodStarts(new Date('2026-11-15T10:00:00Z')).week.toISOString()).toBe('2026-11-08T23:00:00.000Z')
    // On Monday itself, it began that midnight
    expect(periodStarts(new Date('2026-11-09T10:00:00Z')).week.toISOString()).toBe('2026-11-08T23:00:00.000Z')
  })

  it('starts the month on the 1st in Lagos, even across a month boundary', () => {
    expect(periodStarts(new Date('2026-11-12T10:00:00Z')).month.toISOString()).toBe('2026-10-31T23:00:00.000Z')
    // 23:30 UTC on 30 Nov is already 1 Dec in Lagos
    expect(periodStarts(new Date('2026-11-30T23:30:00Z')).month.toISOString()).toBe('2026-11-30T23:00:00.000Z')
  })
})
