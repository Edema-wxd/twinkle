'use client'

import { useState } from 'react'

type StatEntry = {
  count: number
  totalSales: number
}

type StatsPanelProps = {
  stats: {
    today: StatEntry
    week: StatEntry
    month: StatEntry
  }
}

type Tab = 'today' | 'week' | 'month'

const TAB_LABELS: { id: Tab; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
]

function formatNaira(amount: number): string {
  return '₦' + amount.toLocaleString('en-NG')
}

export default function StatsPanel({ stats }: StatsPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('today')

  const current = stats[activeTab]

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex rounded-lg overflow-hidden w-fit">
        {TAB_LABELS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-gold text-white'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total Sales */}
        <div className="bg-stone-800 rounded-lg p-6">
          <p className="text-stone-400 text-sm font-medium mb-2">
            Total Sales
          </p>
          <p className="text-3xl font-bold text-gold">
            {formatNaira(current.totalSales)}
          </p>
        </div>

        {/* Order Count */}
        <div className="bg-stone-800 rounded-lg p-6">
          <p className="text-stone-400 text-sm font-medium mb-2">Orders</p>
          <p className="text-3xl font-bold text-gold">{current.count}</p>
        </div>
      </div>
    </div>
  )
}
