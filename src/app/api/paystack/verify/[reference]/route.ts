import { NextRequest, NextResponse } from 'next/server'
import { recordPaidOrder } from '@/lib/payments/paidOrder'

type PaystackVerifyResponse = {
  status: boolean
  message?: string
  data?: {
    reference: string
    status: string // 'success' | ...
    amount: number // kobo
    currency: string
    customer: { email: string }
    ip_address?: string | null
    metadata?: unknown
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  const { reference } = await params

  if (!process.env.PAYSTACK_SECRET_KEY) {
    return NextResponse.json(
      { error: 'PAYSTACK_SECRET_KEY is not configured' },
      { status: 500 }
    )
  }

  // Verify transaction with Paystack (server-side) so local/dev works even when
  // webhooks can't reach localhost, and to reduce "paid but dashboard not updated" races.
  let payload: PaystackVerifyResponse
  try {
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
        cache: 'no-store',
      }
    )

    payload = (await res.json()) as PaystackVerifyResponse
    if (!res.ok) {
      return NextResponse.json(
        { error: payload?.message ?? 'Paystack verify failed' },
        { status: 502 }
      )
    }
  } catch (e) {
    return NextResponse.json(
      { error: 'Failed to reach Paystack verify API', detail: String(e) },
      { status: 502 }
    )
  }

  if (!payload?.status || !payload.data) {
    return NextResponse.json(
      { error: payload?.message ?? 'Invalid Paystack verify response' },
      { status: 502 }
    )
  }

  if (payload.data.reference !== reference) {
    return NextResponse.json(
      { error: 'Reference mismatch in Paystack verify response' },
      { status: 400 }
    )
  }

  if (payload.data.status !== 'success') {
    return NextResponse.json(
      { ok: false, reference, status: payload.data.status },
      { status: 409 }
    )
  }

  // Re-price server-side and compare with the amount Paystack actually charged.
  // Idempotent with the webhook: whichever arrives first creates the order; this
  // never rewinds an existing order's status (e.g. 'shipped' back to 'paid').
  const recorded = await recordPaidOrder({
    reference,
    amountKobo: payload.data.amount,
    currency: payload.data.currency,
    customerEmail: payload.data.customer.email,
    ipAddress: payload.data.ip_address ?? null,
    payload: payload.data,
    metadata: payload.data.metadata,
  })

  if (!recorded) {
    return NextResponse.json({ error: 'Missing required metadata to build order', reference }, { status: 400 })
  }

  return NextResponse.json({ ok: true, reference, orderId: recorded.orderId, status: recorded.status })
}
