import { describe, it, expect } from 'vitest'
import { postState } from '@/lib/blog/live'
import { revisionLabel } from '@/lib/blog/live'

const NOW = new Date('2026-11-15T12:00:00Z')
const past = '2026-11-01T09:00:00Z'
const future = '2026-12-01T09:00:00Z'

describe('postState', () => {
  it('draft, scheduled or live', () => {
    expect(postState({ published: false, publishedAt: future }, NOW)).toBe('draft')
    expect(postState({ published: true, publishedAt: future }, NOW)).toBe('scheduled')
    expect(postState({ published: true, publishedAt: past }, NOW)).toBe('live')
    expect(postState({ published: true, publishedAt: null }, NOW)).toBe('live')
  })
})

describe('revisionLabel', () => {
  it('names what the save did', () => {
    expect(revisionLabel(null, { published: false, publishedAt: null })).toBe('Draft saved')
    expect(revisionLabel(null, { published: true, publishedAt: future })).toBe('Scheduled')
    expect(revisionLabel({ published: false }, { published: true, publishedAt: past })).toBe('Published')
    expect(revisionLabel({ published: true }, { published: false, publishedAt: past })).toBe('Unpublished')
    expect(revisionLabel({ published: true }, { published: true, publishedAt: past })).toBe('Live post updated')
    expect(revisionLabel({ published: true, publishedAt: future }, { published: true, publishedAt: future })).toBe('Schedule updated')
    expect(revisionLabel({ published: true, publishedAt: future }, { published: true, publishedAt: past })).toBe('Published')
    expect(revisionLabel({ published: true, publishedAt: past }, { published: true, publishedAt: future })).toBe('Scheduled')
    expect(revisionLabel({ published: true }, { published: true, publishedAt: past }, true)).toMatch(/saved for later/)
  })
})
