'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Order } from '@/types/supabase'
import { OrderStatusSelect } from './OrderStatusSelect'

type StatusTab = 'All' | 'Paid' | 'Processing' | 'Shipped' | 'Delivered'

const STATUS_TABS: StatusTab[] = [
  'All',
  'Paid',
  'Processing',
  'Shipped',
  'Delivered',
]

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

function shortRef(ref: string): string {
  return ref.slice(-10).toUpperCase()
}

interface OrdersTableProps {
  orders: Order[]
}

export function OrdersTable({ orders }: OrdersTableProps) {
  const [activeTab, setActiveTab] = useState<StatusTab>('All')

  const filteredOrders = useMemo(() => {
    if (activeTab === 'All') return orders
    return orders.filter(
      (o) => o.status.toLowerCase() === activeTab.toLowerCase()
    )
  }, [orders, activeTab])

  // Count per tab
  function countForTab(tab: StatusTab): number {
    if (tab === 'All') return orders.length
    return orders.filter(
      (o) => o.status.toLowerCase() === tab.toLowerCase()
    ).length
  }

  return (
    <div className="space-y-4">
      {/* Status tab bar */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-gold text-white'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700 border border-stone-700'
            }`}
          >
            {tab} ({countForTab(tab)})
          </button>
        ))}
      </div>

      {/* Table */}
      {filteredOrders.length === 0 ? (
        <div className="bg-stone-800 rounded-lg p-12 text-center text-stone-400">
          No orders with this status
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-stone-700">
          <table className="min-w-max w-full text-sm">
            <thead className="bg-stone-800 text-stone-400 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Order #</th>
                <th className="px-4 py-3 text-left font-medium">Customer</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">
                  Date
                </th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-700">
              {filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  className="bg-stone-900 hover:bg-stone-800 transition-colors"
                >
                  {/* Order # — linked to detail page */}
                  <td className="px-4 py-3 font-mono text-stone-300 whitespace-nowrap">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="hover:text-gold transition-colors underline underline-offset-2"
                    >
                      #{shortRef(order.paystack_reference)}
                    </Link>
                  </td>

                  {/* Customer */}
                  <td className="px-4 py-3 text-white">
                    {order.customer_name}
                  </td>

                  {/* Date — hidden on mobile */}
                  <td className="px-4 py-3 text-stone-400 hidden md:table-cell whitespace-nowrap">
                    {formatDate(order.created_at)}
                  </td>

                  {/* Total */}
                  <td className="px-4 py-3 text-stone-200 text-right whitespace-nowrap">
                    {formatNaira(order.total)}
                  </td>

                  {/* Status — inline dropdown */}
                  <td className="px-4 py-3">
                    <OrderStatusSelect
                      orderId={order.id}
                      currentStatus={order.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
