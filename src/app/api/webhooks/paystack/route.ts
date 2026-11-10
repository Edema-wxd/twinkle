import crypto from 'crypto'
import { NextRequest, NextResponse, after } from 'next/server'
import { recordPaidOrder, PAYMENT_REVIEW_STATUS } from '@/lib/payments/paidOrder'
import {
  claimOrderNotificationSend,
  ensureOrderNotification,
  getAdminNotificationEmail,
  markOrderNotificationFailed,
  markOrderNotificationSent,
} from '@/lib/notifications/notificationState'
import { sendAdminOrderEmail } from '@/lib/notifications/adminOrderEmail'
import { sendCustomerEmail, tryClaimStatusEmail, releaseStatusEmailClaim } from '@/lib/notifications/customerEmail'
import { forwardSubscriptionEvent } from '@/lib/paystack/forwardSubscriptionEvent'

// ── Paystack webhook payload types ──────────────────────────────────────────

interface PaystackChargeData {
  reference: string
  amount: number // in kobo: what Paystack actually charged
  currency?: string
  customer: { email: string }
  ip_address: string | null
  metadata: unknown // untrusted (set by the browser); re-priced server-side
}

interface PaystackEvent {
  event: string
  data: PaystackChargeData
}

// ── Webhook handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Read raw body first — must happen before any JSON parsing
  const body = await req.text()

  // 2. Verify HMAC SHA512 signature
  const signature = req.headers.get('x-paystack-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
  }

  const expectedSignature = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(body)
    .digest('hex')

  if (signature !== expectedSignature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // 3. Parse event
  let event: PaystackEvent
  try {
    event = JSON.parse(body)
  } catch {
    console.error('[webhook] Malformed JSON body for signature', signature)
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // 4. Hand subscription events to QRiate+, which bills through this same
  //    Paystack account. Paystack allows one webhook URL per account and it is
  //    this one, so those events arrive here and would otherwise be lost.
  //
  //    In `after()` deliberately: it runs once we have already answered
  //    Paystack, so a QRiate+ outage can never delay or fail a Twinkle Locs
  //    order. It forwards nothing for a store charge, and never throws.
  after(() => forwardSubscriptionEvent(body, signature, event))

  // 5. Handle charge.success — await to ensure DB write completes before
  //    returning 200 (Paystack allows up to 10 seconds; two inserts are fast)
  try {
    if (event.event === 'charge.success') {
      await handleChargeSuccess(event.data)
    }
  } catch (err) {
    console.error('[webhook] Unhandled error in handleChargeSuccess:', err)
    // Return non-2xx so Paystack retries. Payload-level issues should be handled
    // inside handleChargeSuccess without throwing (idempotent + safe no-op).
    return NextResponse.json({ error: 'processing_error' }, { status: 500 })
  }

  return NextResponse.json({ received: true }, { status: 200 })
}

// ── Order creation ───────────────────────────────────────────────────────────

async function handleChargeSuccess(data: PaystackChargeData) {
  // Re-prices the order server-side and compares with data.amount (see paidOrder.ts).
  // Idempotent: on duplicates it returns the existing order and we continue to the
  // notification path, which has its own idempotency.
  const recorded = await recordPaidOrder({
    reference: data.reference,
    amountKobo: data.amount,
    currency: data.currency,
    customerEmail: data.customer.email,
    ipAddress: data.ip_address,
    payload: data,
    metadata: data.metadata,
  })
  if (!recorded) {
    console.error('[webhook] Missing metadata fields for reference:', data.reference)
    return
  }

  const orderId = recorded.orderId
  const flagged = recorded.status === PAYMENT_REVIEW_STATUS
  const orderForEmail = {
    customerName: recorded.customerName,
    customerEmail: recorded.customerEmail,
    customerPhone: recorded.customerPhone,
    deliveryState: recorded.deliveryState,
    totalNaira: recorded.totalNaira,
  }
  const emailItems = recorded.emailItems

  // ── Admin notification (idempotent + bounded retries) ───────────────────────

  const to = await getAdminNotificationEmail()
  const notif = await ensureOrderNotification({ orderId, channel: 'email' })

  if (notif.status === 'sent') return
  if (notif.attempts >= 3) return
  const claimed = await claimOrderNotificationSend({ id: notif.id })
  if (!claimed) return

  const itemCount = emailItems.length

  try {
    await sendAdminOrderEmail({
      to,
      order: {
        reference: data.reference,
        customerName: orderForEmail.customerName,
        customerEmail: orderForEmail.customerEmail,
        customerPhone: orderForEmail.customerPhone,
        deliveryState: orderForEmail.deliveryState,
        totalNaira: orderForEmail.totalNaira,
        itemCount,
        amountPaidNaira: recorded.amountPaidNaira,
        paymentIssue: recorded.paymentIssue,
      },
    })
    await markOrderNotificationSent({ id: notif.id })
  } catch (err) {
    const { attempts } = await markOrderNotificationFailed({ id: notif.id, error: String(err) })
    console.error('[webhook] Admin notification failed', {
      reference: data.reference,
      notificationId: notif.id,
      attempts,
      error: String(err).slice(0, 500),
    })

    if (attempts < 3) {
      throw err
    }
  }

  // ── Customer confirmation email (non-blocking) ───────────────────────────────
  // Not for flagged orders: the admin confirms (or refunds) those by hand first.
  if (flagged) return

  const claimId = await tryClaimStatusEmail(orderId, 'confirmed').catch(() => null)
  if (claimId) {
    try {
      await sendCustomerEmail({
        to: orderForEmail.customerEmail,
        customerName: orderForEmail.customerName,
        orderReference: data.reference,
        totalNaira: orderForEmail.totalNaira,
        event: 'confirmed',
        items: emailItems,
        orderId,
      })
    } catch (err) {
      console.error('[webhook] Customer confirmation email failed:', {
        reference: data.reference,
        error: String(err).slice(0, 500),
      })
      await releaseStatusEmailClaim(claimId).catch(() => null)
    }
  }
}
