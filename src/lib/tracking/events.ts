'use client'

import { getConsent } from './consent'
import { loadPixels, loadedPixels } from './pixels'

/**
 * Ad tracking events (Meta Pixel + TikTok Pixel), one call for both.
 *
 * Components call trackEvent() and never talk to fbq/ttq directly. The tracking
 * layer maps each event to Meta's and TikTok's names, sends it only when the
 * visitor accepted cookies (see ./consent), and never throws, so a blocked or
 * missing pixel can't break a button.
 *
 * Values are in Naira (NGN). Content ids are product ids (the products table's
 * uuid), the same on every event, so the ad platforms can join them up.
 *
 * | Event            | Meta                 | TikTok              |
 * |------------------|----------------------|---------------------|
 * | ViewContent      | ViewContent          | ViewContent         |
 * | SelectVariant    | SelectVariant (custom) | SelectVariant (custom) |
 * | AddToCart        | AddToCart            | AddToCart           |
 * | InitiateCheckout | InitiateCheckout     | InitiateCheckout    |
 * | Purchase         | Purchase             | CompletePayment     |
 * | Lead             | Lead                 | SubmitForm          |
 * | Contact          | Contact              | Contact             |
 */
export type TrackEvent =
  | { name: 'ViewContent'; contentIds: string[]; value?: number }
  | { name: 'SelectVariant'; productId: string; size: string; pack: number; thread?: string }
  | { name: 'AddToCart'; contentIds: string[]; contentName?: string; value: number; quantity: number }
  | { name: 'InitiateCheckout'; value: number; numItems: number }
  | {
      name: 'Purchase'
      contentIds: string[]
      value: number
      numItems: number
      orderId: string
      /** Optional per-product detail (quantity, unit price) for richer reporting */
      contents?: PurchaseContent[]
    }
  | { name: 'Lead'; source: string }
  | { name: 'Contact'; location: string }

export type PurchaseContent = { id: string; quantity: number; price?: number }

export type TrackOptions = {
  /** Deduplication id shared with the server-side event (Purchase uses the order reference) */
  eventId?: string
}

const CURRENCY = 'NGN'

type PixelCall = { name: string; params: Record<string, unknown> }
export type MappedEvent = { meta: PixelCall & { custom: boolean }; tiktok: PixelCall }

const num = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? n : undefined)

/** Drop undefined values so the pixels don't receive empty keys */
function compact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))
}

/** The Meta and TikTok calls for one event (pure: exported for tests) */
export function mapEvent(event: TrackEvent): MappedEvent {
  switch (event.name) {
    case 'ViewContent':
      return {
        meta: { name: 'ViewContent', custom: false, params: compact({ content_ids: event.contentIds, content_type: 'product', value: num(event.value), currency: CURRENCY }) },
        tiktok: {
          name: 'ViewContent',
          params: compact({ contents: event.contentIds.map((id) => ({ content_id: id })), content_type: 'product', value: num(event.value), currency: CURRENCY }),
        },
      }
    case 'SelectVariant': {
      const detail = compact({ size: event.size, pack: event.pack, thread: event.thread })
      return {
        meta: { name: 'SelectVariant', custom: true, params: { content_ids: [event.productId], content_type: 'product', ...detail } },
        tiktok: { name: 'SelectVariant', params: { contents: [{ content_id: event.productId }], content_type: 'product', ...detail } },
      }
    }
    case 'AddToCart': {
      const qty = Math.max(1, Math.trunc(event.quantity) || 1)
      // Unit price is only known for a single product
      const price = event.contentIds.length === 1 ? Math.round((event.value / qty) * 100) / 100 : undefined
      return {
        meta: {
          name: 'AddToCart',
          custom: false,
          params: compact({
            content_ids: event.contentIds,
            content_name: event.contentName,
            content_type: 'product',
            contents: event.contentIds.map((id) => compact({ id, quantity: qty, item_price: price })),
            value: event.value,
            currency: CURRENCY,
          }),
        },
        tiktok: {
          name: 'AddToCart',
          params: {
            contents: event.contentIds.map((id) => compact({ content_id: id, content_name: event.contentName, quantity: qty, price })),
            content_type: 'product',
            value: event.value,
            currency: CURRENCY,
          },
        },
      }
    }
    case 'InitiateCheckout':
      return {
        meta: { name: 'InitiateCheckout', custom: false, params: { value: event.value, currency: CURRENCY, num_items: event.numItems } },
        tiktok: { name: 'InitiateCheckout', params: { value: event.value, currency: CURRENCY, content_type: 'product', quantity: event.numItems } },
      }
    case 'Purchase': {
      const contents: PurchaseContent[] = event.contents?.length ? event.contents : event.contentIds.map((id) => ({ id, quantity: 1 }))
      return {
        meta: {
          name: 'Purchase',
          custom: false,
          params: {
            content_ids: event.contentIds,
            content_type: 'product',
            contents: contents.map((c) => compact({ id: c.id, quantity: c.quantity, item_price: c.price })),
            value: event.value,
            currency: CURRENCY,
            num_items: event.numItems,
            order_id: event.orderId,
          },
        },
        tiktok: {
          name: 'CompletePayment',
          params: {
            contents: contents.map((c) => compact({ content_id: c.id, quantity: c.quantity, price: c.price })),
            content_type: 'product',
            value: event.value,
            currency: CURRENCY,
            order_id: event.orderId,
          },
        },
      }
    }
    case 'Lead':
      return {
        meta: { name: 'Lead', custom: false, params: { source: event.source } },
        tiktok: { name: 'SubmitForm', params: { source: event.source } },
      }
    case 'Contact':
      return {
        meta: { name: 'Contact', custom: false, params: { location: event.location } },
        tiktok: { name: 'Contact', params: { location: event.location } },
      }
  }
}

/**
 * Send an event to the ad pixels. Safe to call anywhere in client code: on the
 * server, before consent, or with pixels blocked it does nothing.
 */
export function trackEvent(event: TrackEvent, options?: TrackOptions): void {
  try {
    if (typeof window === 'undefined' || getConsent() !== 'granted') return
    if (!loadPixels()) return
    const { meta, tiktok } = mapEvent(event)
    const eventId = options?.eventId
    const loaded = loadedPixels()

    if (loaded.meta && window.fbq) {
      try {
        const extra = eventId ? [{ eventID: eventId }] : []
        window.fbq(meta.custom ? 'trackCustom' : 'track', meta.name, meta.params, ...extra)
      } catch (e) {
        console.warn('[tracking] Meta event failed', e)
      }
    }
    if (loaded.tiktok && window.ttq) {
      try {
        const extra = eventId ? [{ event_id: eventId }] : []
        window.ttq.track(tiktok.name, tiktok.params, ...extra)
      } catch (e) {
        console.warn('[tracking] TikTok event failed', e)
      }
    }
  } catch {
    /* tracking never breaks the page */
  }
}
