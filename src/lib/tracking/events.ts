'use client'

/**
 * Ad tracking events (Meta Pixel + TikTok Pixel), one call for both.
 *
 * Components call trackEvent() and never talk to fbq/ttq directly. The tracking
 * layer maps each event to Meta's and TikTok's names, sends it only when the
 * visitor accepted cookies (see ./consent), and never throws, so a blocked or
 * missing pixel can't break a button.
 *
 * Values are in Naira (NGN).
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
  | { name: 'Purchase'; contentIds: string[]; value: number; numItems: number; orderId: string }
  | { name: 'Lead'; source: string }
  | { name: 'Contact'; location: string }

export type TrackOptions = {
  /** Deduplication id shared with the server-side event (Purchase uses the order reference) */
  eventId?: string
}

/**
 * Send an event to the ad pixels. Safe to call anywhere in client code: on the
 * server, before consent, or with pixels blocked it does nothing.
 *
 * NOTE: placeholder until the tracking layer lands; the signature is the contract.
 */
export function trackEvent(event: TrackEvent, options?: TrackOptions): void {
  void event
  void options
}
