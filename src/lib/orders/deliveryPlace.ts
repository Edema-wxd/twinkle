/** Pure helpers (safe in the browser): where an order is going. */

/** The area (LGA) the customer chose at checkout. Not an orders column: it lives in the Paystack metadata. */
export function deliveryAreaFromPayload(paystackPayload: unknown): string | null {
  const meta = (paystackPayload as { metadata?: { customer_details?: { lga?: unknown } } } | null)?.metadata
  const lga = meta?.customer_details?.lga
  return typeof lga === 'string' && lga.trim() ? lga.trim().slice(0, 100) : null
}

/** "Lekki Phase 1, Lagos", or just the state when no area was chosen. */
export function deliveryPlace(state: string, area: string | null): string {
  return area && area.toLowerCase() !== state.toLowerCase() ? `${area}, ${state}` : state
}
