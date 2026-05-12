import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { db } from '@/db'
import { orders, orderItems } from '@/db'
import { eq } from 'drizzle-orm'
import { ReviewForm } from './ReviewForm'

export const metadata: Metadata = {
  title: 'Leave a Review',
  robots: { index: false },
}

interface PageProps {
  searchParams: Promise<{ ref?: string }>
}

export default async function ReviewPage({ searchParams }: PageProps) {
  const { ref } = await searchParams

  if (!ref) notFound()

  // Fetch the order and its items
  const [order] = await db
    .select({ id: orders.id, customerName: orders.customerName })
    .from(orders)
    .where(eq(orders.paystackReference, ref))
    .limit(1)

  if (!order) notFound()

  const items = await db
    .select({
      productId: orderItems.productId,
      productName: orderItems.productName,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))

  // Deduplicate by productId (customer might have ordered same product multiple times)
  const seen = new Set<string>()
  const products = items.filter((item) => {
    if (seen.has(item.productId)) return false
    seen.add(item.productId)
    return true
  })

  if (!products.length) notFound()

  const firstName = order.customerName.split(' ')[0] || order.customerName

  return (
    <div className="min-h-screen bg-cream py-16 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-10">
          <p className="font-body text-sm text-charcoal/50 uppercase tracking-widest mb-3">
            Twinkle Locs
          </p>
          <h1 className="font-heading text-3xl font-bold text-cocoa mb-3">
            Share Your Experience
          </h1>
          <p className="font-body text-charcoal/60">
            Hi {firstName}! Your honest review helps other loc lovers find us.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-charcoal/10 p-8">
          <ReviewForm orderRef={ref} products={products} />
        </div>
      </div>
    </div>
  )
}
