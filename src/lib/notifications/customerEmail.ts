import { eq } from 'drizzle-orm'
import { db, orderStatusEmails, emailTemplates } from '@/db'
import { sendEmail } from '@/lib/email/client'
import {
  DEFAULT_ORDER_TEMPLATES,
  renderOrderEmail,
  type CustomerEmailEvent,
  type OrderEmailItem,
  type OrderTemplate,
} from '@/lib/email/orderTemplate'

export type { CustomerEmailEvent, OrderEmailItem }

interface CustomerEmailInput {
  to: string
  customerName: string
  orderReference: string
  totalNaira: number
  event: CustomerEmailEvent
  trackingNumber?: string | null
  items?: OrderEmailItem[]
  orderId?: string | null
  /**
   * Manual re-send from the admin: skip the idempotency key so Resend sends it
   * again. Automatic sends keep the key, so retries never email a customer twice.
   */
  force?: boolean
}

/** The admin-edited template for an event, falling back to the built-in default. */
export async function resolveTemplate(event: CustomerEmailEvent): Promise<OrderTemplate> {
  try {
    const [row] = await db.select().from(emailTemplates).where(eq(emailTemplates.key, event)).limit(1)
    if (row) return { subject: row.subject, bannerColor: row.bannerColor, bannerLabel: row.bannerLabel, body: row.body }
  } catch {
    // DB unavailable: use the default
  }
  return DEFAULT_ORDER_TEMPLATES[event]
}

/** Sends a customer order email via Resend. Throws if it couldn't be sent (callers rely on that). */
export async function sendCustomerEmail(input: CustomerEmailInput): Promise<void> {
  const template = await resolveTemplate(input.event)
  const { subject, html, text } = renderOrderEmail({
    template,
    event: input.event,
    customerName: input.customerName,
    orderReference: input.orderReference,
    totalNaira: input.totalNaira,
    trackingNumber: input.trackingNumber,
    items: input.items,
  })

  const result = await sendEmail({
    to: input.to,
    subject,
    html,
    text,
    category: 'order',
    templateKey: input.event,
    orderId: input.orderId ?? null,
    idempotencyKey: input.force ? undefined : `order:${input.orderReference}:${input.event}`,
  })

  if (!result.ok) throw new Error(result.error)
}

// Atomically records intent to send a status email.
// Returns the new row's id if this event hasn't been sent yet, or null if already sent.
export async function tryClaimStatusEmail(orderId: string, event: CustomerEmailEvent): Promise<string | null> {
  const [inserted] = await db
    .insert(orderStatusEmails)
    .values({ orderId, eventType: event })
    .onConflictDoNothing()
    .returning({ id: orderStatusEmails.id })
  return inserted?.id ?? null
}

// Removes a claimed record so the email can be retried on the next attempt.
export async function releaseStatusEmailClaim(id: string): Promise<void> {
  await db.delete(orderStatusEmails).where(eq(orderStatusEmails.id, id))
}
