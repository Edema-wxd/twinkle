import { db } from '@/db'
import { orderNotifications, settings } from '@/db'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { BUSINESS } from '@/lib/config/business'

export type NotificationChannel = 'email' | 'whatsapp'

type NotificationStatus = 'pending' | 'sending' | 'sent' | 'failed'

export async function getAdminNotificationEmail(): Promise<string> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, 'email'))
    .limit(1)

  const email = row?.value?.trim()
  if (email) return email

  return BUSINESS.support.email
}

export async function ensureOrderNotification(params: {
  orderId: string
  channel: NotificationChannel
}): Promise<{ id: string; status: NotificationStatus; attempts: number }> {
  const [inserted] = await db
    .insert(orderNotifications)
    .values({
      orderId: params.orderId,
      channel: params.channel,
      status: 'pending',
      attempts: 0,
    })
    .onConflictDoNothing()
    .returning({
      id: orderNotifications.id,
      status: orderNotifications.status,
      attempts: orderNotifications.attempts,
    })

  if (inserted) {
    return {
      id: inserted.id,
      status: inserted.status as NotificationStatus,
      attempts: inserted.attempts,
    }
  }

  const [existing] = await db
    .select({
      id: orderNotifications.id,
      status: orderNotifications.status,
      attempts: orderNotifications.attempts,
    })
    .from(orderNotifications)
    .where(and(eq(orderNotifications.orderId, params.orderId), eq(orderNotifications.channel, params.channel)))
    .limit(1)

  if (!existing) {
    // Extremely unlikely (race + delete), but keeps callers safe.
    throw new Error('Failed to ensure order notification row exists')
  }

  return {
    id: existing.id,
    status: existing.status as NotificationStatus,
    attempts: existing.attempts,
  }
}

export async function markOrderNotificationSent(params: { id: string }): Promise<void> {
  await db
    .update(orderNotifications)
    .set({
      status: 'sent',
      sentAt: new Date(),
      updatedAt: new Date(),
      lastError: null,
    })
    .where(eq(orderNotifications.id, params.id))
}

/**
 * Atomically claims responsibility to send a notification.
 *
 * This prevents duplicate sends when the same webhook is delivered multiple times
 * concurrently (e.g., Paystack retries or parallel deliveries).
 */
export async function claimOrderNotificationSend(params: { id: string }): Promise<boolean> {
  const [row] = await db
    .update(orderNotifications)
    .set({
      status: 'sending',
      updatedAt: new Date(),
    })
    .where(and(eq(orderNotifications.id, params.id), inArray(orderNotifications.status, ['pending', 'failed'])))
    .returning({ id: orderNotifications.id })

  return Boolean(row?.id)
}

export async function markOrderNotificationFailed(params: {
  id: string
  error: string
}): Promise<{ attempts: number }> {
  const lastError = params.error.trim().slice(0, 500)

  const [row] = await db
    .update(orderNotifications)
    .set({
      status: 'failed',
      attempts: sql`${orderNotifications.attempts} + 1`,
      lastError,
      updatedAt: new Date(),
    })
    .where(eq(orderNotifications.id, params.id))
    .returning({ attempts: orderNotifications.attempts })

  if (!row) {
    throw new Error('Failed to mark order notification failed')
  }

  return { attempts: row.attempts }
}

