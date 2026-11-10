import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/server'
import { DEFAULT_ORDER_TEMPLATES, renderOrderEmail, type CustomerEmailEvent } from '@/lib/email/orderTemplate'

/**
 * Preview an order email exactly as customers will get it: same renderer as
 * real sends (lib/email/orderTemplate.ts), filled with sample order data.
 */
export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { templateKey, subject, bannerColor, bannerLabel, body: templateBody } = body as Record<string, unknown>

  if (
    typeof templateKey !== 'string' ||
    !(templateKey in DEFAULT_ORDER_TEMPLATES) ||
    typeof bannerColor !== 'string' ||
    typeof bannerLabel !== 'string' ||
    typeof templateBody !== 'string'
  ) {
    return NextResponse.json({ error: 'templateKey, bannerColor, bannerLabel, body are required' }, { status: 400 })
  }

  const event = templateKey as CustomerEmailEvent
  const rendered = renderOrderEmail({
    template: {
      subject: typeof subject === 'string' && subject.trim() ? subject : DEFAULT_ORDER_TEMPLATES[event].subject,
      bannerColor,
      bannerLabel,
      body: templateBody,
    },
    event,
    customerName: 'Amaka Obi',
    orderReference: 'tw-preview-0000abc123',
    totalNaira: 37900,
    trackingNumber: event === 'shipped' ? 'GIG-PREVIEW-12345' : null,
    items: [
      { productName: 'Gold Twinkles', variantName: '4mm', quantity: 1, unitPrice: 15000, lineTotal: 15000, tierQty: 50, threadColour: 'Black' },
      { productName: 'Silver Twinkles', variantName: '6mm', quantity: 1, unitPrice: 15000, lineTotal: 15000, tierQty: 50, threadColour: 'Gold' },
    ],
  })

  return NextResponse.json({ html: rendered.html, subject: rendered.subject })
}
