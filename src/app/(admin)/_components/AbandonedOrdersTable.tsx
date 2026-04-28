'use client'

import Link from 'next/link'
import { AbandonedOrder } from '@/types/db'

function formatNaira(amount: number): string {
  return '₦' + amount.toLocaleString('en-NG')
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

interface AbandonedOrdersTableProps {
  abandonedOrders: Pick<
    AbandonedOrder,
    'id' | 'created_at' | 'customer_name' | 'customer_email' | 'customer_phone' | 'total' | 'recovered' | 'recovered_at'
  >[]
}

export function AbandonedOrdersTable({ abandonedOrders }: AbandonedOrdersTableProps) {
  if (abandonedOrders.length === 0) {
    return (
      <div className="bg-stone-800 rounded-lg p-12 text-center text-stone-400">
        No abandoned checkouts yet
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-stone-700">
      <table className="min-w-max w-full text-sm">
        <thead className="bg-stone-800 text-stone-400 uppercase text-xs tracking-wide">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Customer</th>
            <th className="px-4 py-3 text-left font-medium">Email</th>
            <th className="px-4 py-3 text-left font-medium">Phone</th>
            <th className="px-4 py-3 text-right font-medium">Total</th>
            <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Date</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-700">
          {abandonedOrders.map((order) => (
            <tr
              key={order.id}
              className={`transition-colors ${order.recovered ? 'bg-stone-900/50 opacity-60' : 'bg-stone-900 hover:bg-stone-800'}`}
            >
              <td className="px-4 py-3 text-white">
                <Link
                  href={`/admin/abandoned-orders/${order.id}`}
                  className="hover:text-gold transition-colors underline underline-offset-2"
                >
                  {order.customer_name}
                </Link>
              </td>
              <td className="px-4 py-3 text-stone-300">{order.customer_email}</td>
              <td className="px-4 py-3 text-stone-300">{order.customer_phone}</td>
              <td className="px-4 py-3 text-stone-200 text-right whitespace-nowrap">
                {formatNaira(order.total)}
              </td>
              <td className="px-4 py-3 text-stone-400 hidden md:table-cell whitespace-nowrap">
                {formatDate(order.created_at)}
              </td>
              <td className="px-4 py-3">
                {order.recovered ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900/50 text-green-400">
                    Recovered
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-900/50 text-amber-400">
                    Abandoned
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
