import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/server'
import { db } from '@/db'
import { emailTemplates } from '@/db'

const DEFAULT_TEMPLATES = [
  {
    key: 'confirmed',
    name: 'Order Confirmed',
    subject: 'Order confirmed — #{ref} | Twinkle Locs',
    bannerColor: '#b45309',
    bannerLabel: '✓ Order Confirmed',
    body: "We've received your order and payment — thank you! We'll start preparing your loc beads shortly and will keep you updated as things move along.",
  },
  {
    key: 'processing',
    name: 'Order Processing',
    subject: 'Your order is being prepared — #{ref} | Twinkle Locs',
    bannerColor: '#1d4ed8',
    bannerLabel: '⚙ Order Processing',
    body: "Good news — your order is now being prepared! Our team is getting your loc beads ready. We'll let you know as soon as they've been dispatched.",
  },
  {
    key: 'shipped',
    name: 'Order Shipped',
    subject: 'Your order has shipped! — #{ref} | Twinkle Locs',
    bannerColor: '#6d28d9',
    bannerLabel: '✈ Order Shipped',
    body: "Your Twinkle Locs order is on its way! Expect delivery within the standard timeframe for your area. If you have any questions about your delivery, feel free to get in touch.",
  },
  {
    key: 'delivered',
    name: 'Order Delivered',
    subject: 'Your order has been delivered — #{ref} | Twinkle Locs',
    bannerColor: '#15803d',
    bannerLabel: '✓ Order Delivered',
    body: "Your order has arrived! We hope you love your new loc beads. If you have a moment, a review would mean the world to our small business — thank you for choosing Twinkle Locs.",
  },
  {
    key: 'review_reminder',
    name: 'Review Reminder',
    subject: "How was your Twinkle Locs experience? — #{ref}",
    bannerColor: '#d4a843',
    bannerLabel: "⭐ We'd love your feedback",
    body: "We hope you're enjoying your loc beads! Reviews from customers like you help other loc lovers discover us and keep our small business growing. It only takes a minute — we'd really appreciate it.",
  },
]

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let rows = await db.select().from(emailTemplates)

  if (rows.length === 0) {
    await db
      .insert(emailTemplates)
      .values(DEFAULT_TEMPLATES)
      .onConflictDoNothing()
    rows = await db.select().from(emailTemplates)
  }

  // Return in canonical order
  const order = ['confirmed', 'processing', 'shipped', 'delivered', 'review_reminder']
  const sorted = [...rows].sort(
    (a, b) => order.indexOf(a.key) - order.indexOf(b.key)
  )

  return NextResponse.json({ templates: sorted })
}
