export interface ShippingZone {
  id: number
  name: string
  areas: string[]
  defaultFee: number
  deliveryTime: string
}

export const LAGOS_ZONES: ShippingZone[] = [
  {
    id: 1,
    name: 'Lekki Corridor',
    areas: [
      'Lekki Phase 1',
      'Lekki Phase 2',
      'Chevron',
      'Osapa',
      'Jakande',
      'Ikate',
      'Ilasan',
      'Igbo Efon',
      'Agungi',
      'Oral Estate',
    ],
    defaultFee: 3000,
    deliveryTime: '1–2 hrs',
  },
  {
    id: 2,
    name: 'Lagos Island',
    areas: ['Victoria Island', 'Ikoyi', 'Lagos Island', 'Marina', 'Oniru', 'Eko Atlantic'],
    defaultFee: 4500,
    deliveryTime: '1–2 hrs',
  },
  {
    id: 3,
    name: 'Ajah Axis',
    areas: [
      'Ajah',
      'Sangotedo',
      'Awoyaya',
      'Ogombo',
      'Abraham Adesanya',
      'Monastery Road',
      'Gbetu',
    ],
    defaultFee: 3500,
    deliveryTime: '1–2 hrs',
  },
  {
    id: 4,
    name: 'Central Mainland',
    areas: ['Surulere', 'Yaba', 'Ebute Metta', 'Apapa', 'Mushin', 'Oshodi', 'Maryland', 'Gbagada'],
    defaultFee: 6500,
    deliveryTime: '2–3 hrs',
  },
  {
    id: 5,
    name: 'Ikeja Axis',
    areas: ['Ikeja', 'Allen', 'GRA', 'Oregun', 'Ojodu', 'Berger', 'Agege', 'Ifako', 'Ogba', 'Magodo', 'Ketu'],
    defaultFee: 7900,
    deliveryTime: '3–4 hrs',
  },
  {
    id: 6,
    name: 'Far Mainland',
    areas: ['Ikorodu', 'Alimosho', 'Iyana Ipaja', 'Abule Egba', 'Dopemu', 'Ojo', 'Mile 12'],
    defaultFee: 10000,
    deliveryTime: '3–5 hrs',
  },
  {
    id: 7,
    name: 'Remote Areas',
    areas: ['Badagry', 'Epe', 'Ibeju-Lekki', 'Mowe', 'Sagamu Road'],
    defaultFee: 13500,
    deliveryTime: 'Next day',
  },
]

const AREA_TO_ZONE: Record<string, number> = {}
for (const zone of LAGOS_ZONES) {
  for (const area of zone.areas) {
    AREA_TO_ZONE[area] = zone.id
  }
}

export function getZoneIdForArea(area: string): number | null {
  return AREA_TO_ZONE[area] ?? null
}

export function getZoneById(id: number): ShippingZone | undefined {
  return LAGOS_ZONES.find((z) => z.id === id)
}

export function dbKeyForZone(zoneId: number): string {
  return `shipping_zone_${zoneId}_rate`
}
