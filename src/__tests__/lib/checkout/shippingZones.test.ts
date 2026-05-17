import { describe, it, expect } from 'vitest'
import {
  LAGOS_ZONES,
  getZoneIdForArea,
  getZoneById,
  dbKeyForZone,
} from '@/lib/checkout/shippingZones'

describe('LAGOS_ZONES', () => {
  it('has exactly 7 zones', () => {
    expect(LAGOS_ZONES).toHaveLength(7)
  })

  it('zone IDs are 1–7 with no gaps', () => {
    const ids = LAGOS_ZONES.map((z) => z.id).sort((a, b) => a - b)
    expect(ids).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('every zone has at least one area', () => {
    for (const zone of LAGOS_ZONES) {
      expect(zone.areas.length).toBeGreaterThan(0)
    }
  })

  it('every zone has a positive default fee', () => {
    for (const zone of LAGOS_ZONES) {
      expect(zone.defaultFee).toBeGreaterThan(0)
    }
  })
})

describe('getZoneIdForArea', () => {
  it('returns 1 for Lekki Phase 1', () => {
    expect(getZoneIdForArea('Lekki Phase 1')).toBe(1)
  })

  it('returns 2 for Victoria Island', () => {
    expect(getZoneIdForArea('Victoria Island')).toBe(2)
  })

  it('returns 3 for Ajah', () => {
    expect(getZoneIdForArea('Ajah')).toBe(3)
  })

  it('returns 4 for Surulere', () => {
    expect(getZoneIdForArea('Surulere')).toBe(4)
  })

  it('returns 5 for Ikeja', () => {
    expect(getZoneIdForArea('Ikeja')).toBe(5)
  })

  it('returns 6 for Ikorodu', () => {
    expect(getZoneIdForArea('Ikorodu')).toBe(6)
  })

  it('returns 7 for Badagry', () => {
    expect(getZoneIdForArea('Badagry')).toBe(7)
  })

  it('returns null for an unknown area', () => {
    expect(getZoneIdForArea('Abuja')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(getZoneIdForArea('')).toBeNull()
  })

  it('is case-sensitive — "lekki phase 1" does not match', () => {
    expect(getZoneIdForArea('lekki phase 1')).toBeNull()
  })

  it('covers all declared areas across all zones', () => {
    for (const zone of LAGOS_ZONES) {
      for (const area of zone.areas) {
        expect(getZoneIdForArea(area)).toBe(zone.id)
      }
    }
  })
})

describe('getZoneById', () => {
  it('returns the correct zone for each valid id', () => {
    for (const zone of LAGOS_ZONES) {
      expect(getZoneById(zone.id)).toEqual(zone)
    }
  })

  it('returns undefined for id 0', () => {
    expect(getZoneById(0)).toBeUndefined()
  })

  it('returns undefined for id 8', () => {
    expect(getZoneById(8)).toBeUndefined()
  })

  it('zone 1 is Lekki Corridor', () => {
    expect(getZoneById(1)?.name).toBe('Lekki Corridor')
  })

  it('zone 7 is Remote Areas', () => {
    expect(getZoneById(7)?.name).toBe('Remote Areas')
  })
})

describe('dbKeyForZone', () => {
  it('generates the correct key for zone 1', () => {
    expect(dbKeyForZone(1)).toBe('shipping_zone_1_rate')
  })

  it('generates the correct key for zone 7', () => {
    expect(dbKeyForZone(7)).toBe('shipping_zone_7_rate')
  })

  it('produces unique keys for all zones', () => {
    const keys = LAGOS_ZONES.map((z) => dbKeyForZone(z.id))
    const unique = new Set(keys)
    expect(unique.size).toBe(LAGOS_ZONES.length)
  })
})
