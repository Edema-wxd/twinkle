'use client'

import { useState } from 'react'

const STATUS_OPTIONS = ['paid', 'processing', 'shipped', 'delivered'] as const
type OrderStatus = (typeof STATUS_OPTIONS)[number]

const STATUS_COLOURS: Record<OrderStatus, string> = {
  paid: 'text-gold/80',
  processing: 'text-blue-300',
  shipped: 'text-purple-300',
  delivered: 'text-green-300',
}

interface OrderStatusSelectProps {
  orderId: string
  currentStatus: string
  currentTrackingNumber?: string | null
}

export function OrderStatusSelect({
  orderId,
  currentStatus,
  currentTrackingNumber,
}: OrderStatusSelectProps) {
  const [status, setStatus] = useState(currentStatus)
  const [saving, setSaving] = useState(false)
  const [pendingShip, setPendingShip] = useState(false)
  const [trackingInput, setTrackingInput] = useState(currentTrackingNumber ?? '')

  async function saveStatus(newStatus: string, trackingNumber?: string) {
    const previous = status
    setSaving(true)

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          ...(trackingNumber ? { trackingNumber } : {}),
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        alert(`Failed to update status: ${body.error ?? res.statusText}`)
        setStatus(previous)
        return
      }

      setStatus(newStatus)
    } catch (err) {
      alert(`Network error: ${err instanceof Error ? err.message : String(err)}`)
      setStatus(previous)
    } finally {
      setSaving(false)
    }
  }

  function handleSelectChange(newStatus: string) {
    if (newStatus === 'shipped') {
      setPendingShip(true)
    } else {
      setPendingShip(false)
      saveStatus(newStatus)
    }
  }

  async function confirmShipment() {
    setPendingShip(false)
    await saveStatus('shipped', trackingInput.trim() || undefined)
  }

  function cancelShipment() {
    setPendingShip(false)
  }

  const colourClass = STATUS_COLOURS[status as OrderStatus] ?? 'text-stone-300'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <select
          value={pendingShip ? 'shipped' : status}
          onChange={(e) => handleSelectChange(e.target.value)}
          disabled={saving}
          className={`bg-stone-800 border border-stone-600 rounded px-2 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-gold disabled:opacity-50 disabled:cursor-not-allowed ${colourClass}`}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s} className={STATUS_COLOURS[s]}>
              {s}
            </option>
          ))}
        </select>

        {saving && (
          <svg
            className="w-3.5 h-3.5 text-stone-400 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
      </div>

      {pendingShip && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Tracking number (optional)"
            value={trackingInput}
            onChange={(e) => setTrackingInput(e.target.value)}
            className="bg-stone-800 border border-stone-600 rounded px-2 py-1 text-xs text-stone-200 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-gold w-48"
            autoFocus
          />
          <button
            onClick={confirmShipment}
            disabled={saving}
            className="px-3 py-1 bg-purple-700 hover:bg-purple-600 text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
          >
            Confirm
          </button>
          <button
            onClick={cancelShipment}
            className="text-stone-400 hover:text-stone-200 text-xs transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
