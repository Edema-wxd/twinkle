import type { Metadata } from 'next'
import { getPublicOrder } from '@/lib/orders/publicOrder'
import { OrderConfirmationView } from './OrderConfirmationView'
import { OrderPoller } from './OrderPoller'

// Personal order details: never index, never cache between customers
export const metadata: Metadata = { title: 'Your order', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ reference: string }>
}

export default async function OrderConfirmationPage({ params }: PageProps) {
  const { reference } = await params
  const order = await getPublicOrder(reference)

  // Webhook already recorded it: render straight away (no client polling needed)
  if (order) return <OrderConfirmationView order={order} />

  // Payment still being confirmed: poll until the order appears
  return <OrderPoller reference={reference} />
}
