import { Order } from '@/types/db'

type RecentOrdersTableProps = {
  orders: Order[]
}

type StatusKey =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | string

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-900/40 text-yellow-400 border border-yellow-800',
  paid: 'bg-gold/10 text-gold border border-gold/30',
  processing: 'bg-blue-900/40 text-blue-400 border border-blue-800',
  shipped: 'bg-purple-900/40 text-purple-400 border border-purple-800',
  delivered: 'bg-green-900/40 text-green-400 border border-green-800',
}

function statusStyle(status: StatusKey): string {
  return (
    STATUS_STYLES[status] ??
    'bg-stone-700 text-stone-300 border border-stone-600'
  )
}

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
  return ref.slice(-8).toUpperCase()
}

export default function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  if (orders.length === 0) {
    return (
      <div className="bg-stone-800 rounded-lg p-12 text-center">
        <p className="text-stone-400">No orders yet</p>
      </div>
    )
  }

  return (
    <div className="bg-stone-900 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-800 text-stone-400 text-left">
              <th className="px-4 py-3 font-medium">Order #</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">
                Date
              </th>
              <th className="px-4 py-3 font-medium hidden md:table-cell text-right">
                Total
              </th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                className="bg-stone-900 hover:bg-stone-800 transition-colors border-t border-stone-800"
              >
                <td className="px-4 py-3 font-mono text-stone-300">
                  #{shortRef(order.paystack_reference)}
                </td>
                <td className="px-4 py-3 text-white">{order.customer_name}</td>
                <td className="px-4 py-3 text-stone-400 hidden md:table-cell">
                  {formatDate(order.created_at)}
                </td>
                <td className="px-4 py-3 text-stone-200 hidden md:table-cell text-right">
                  {formatNaira(order.total)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle(order.status)}`}
                  >
                    {order.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
