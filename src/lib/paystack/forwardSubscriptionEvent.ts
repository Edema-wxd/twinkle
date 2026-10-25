/**
 * Forward subscription webhooks to QRiate+.
 *
 * Paystack allows exactly one webhook URL per account, and this account's URL
 * belongs to Twinkle Locs. QRiate+ (qriateplus.com) bills through the same
 * Paystack account — both businesses are owned by the same people — so its
 * subscription events arrive here and have to be handed on, or a QRiate+
 * customer pays and never gets their plan.
 *
 * Three rules, because this sits in a live payment path:
 *
 * 1. **Never throw.** Every failure is caught and logged. A QRiate+ outage,
 *    a DNS failure or a timeout must not turn a Twinkle Locs order into a
 *    non-2xx that Paystack then retries.
 * 2. **Forward the body byte for byte, with the original signature.** QRiate+
 *    verifies the same HMAC with the same secret, so re-serialising the JSON
 *    would break a signature that is perfectly valid.
 * 3. **Forward only what QRiate+ could own.** A Twinkle Locs order charge is
 *    not forwarded at all — see `isSubscriptionEvent`.
 *
 * Set QRIATE_WEBHOOK_URL to enable. Unset, forwarding is skipped silently,
 * which is what dev and test want.
 */

/** How long to wait before giving up. Paystack allows us ~10s in total. */
const TIMEOUT_MS = 4000;

/**
 * Deliberately loose. The caller hands us its own strictly-typed store event,
 * and Paystack sends shapes neither app has described -- so this accepts
 * anything and narrows below rather than forcing a cast at the call site.
 */
interface MaybeSubscriptionEvent {
  event?: string;
  data?: {
    plan?: unknown;
    metadata?: unknown;
  };
}

/** `metadata.user_id`, which QRiate+ sets when it starts a checkout. */
function qriateUserId(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const value = (metadata as { user_id?: unknown }).user_id;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * Whether this delivery belongs to QRiate+ rather than the store.
 *
 * `subscription.*` and `invoice.*` are only ever QRiate+: Twinkle Locs sells
 * one-off orders and has no subscriptions at all.
 *
 * `charge.success` is the shared one, and the discriminator is the plan. A
 * store order carries `cart_items` metadata and no plan; a QRiate+ renewal
 * carries a plan code, and its first charge also carries `metadata.user_id`,
 * which QRiate+ sets when it starts the checkout.
 *
 * Deliberately narrow. Forwarding every store order would fill QRiate+'s
 * payment-event log with rows it can only reject, and bury a real failure in
 * the noise.
 */
export function isSubscriptionEvent(event: MaybeSubscriptionEvent): boolean {
  const name = event.event ?? '';

  if (name.startsWith('subscription.') || name.startsWith('invoice.')) {
    return true;
  }

  if (name === 'charge.success') {
    const plan = event.data?.plan;
    const hasPlan =
      typeof plan === 'string'
        ? plan.length > 0
        : // Paystack sends `"plan": []` on a one-off charge and an object on a
          // subscription one, so an array is explicitly NOT a plan.
          Boolean(plan) && !Array.isArray(plan);

    return hasPlan || qriateUserId(event.data?.metadata) !== null;
  }

  return false;
}

/**
 * Hand the delivery on. Returns nothing and never rejects: call it from
 * `after()` so it runs once Twinkle Locs has already answered Paystack.
 */
export async function forwardSubscriptionEvent(
  rawBody: string,
  signature: string,
  event: MaybeSubscriptionEvent
): Promise<void> {
  const target = process.env.QRIATE_WEBHOOK_URL;
  if (!target) return;
  if (!isSubscriptionEvent(event)) return;

  try {
    const response = await fetch(target, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        // The original header, unchanged: QRiate+ recomputes the HMAC over the
        // raw body with the same secret key.
        'x-paystack-signature': signature,
      },
      body: rawBody,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      // Loud, because this is money that has been taken and not yet applied.
      // The event is recoverable: QRiate+ can be replayed from Paystack's
      // dashboard, or from its own qr_payment_events table.
      console.error(
        '[webhook] QRiate+ rejected forwarded event',
        event.event,
        response.status
      );
      return;
    }

    console.info('[webhook] forwarded', event.event, 'to QRiate+');
  } catch (err) {
    console.error('[webhook] could not forward event to QRiate+', event.event, err);
  }
}
