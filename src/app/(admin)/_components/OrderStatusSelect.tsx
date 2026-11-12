'use client'

import { useState } from 'react'

const STATUS_OPTIONS = ['payment_review', 'paid', 'processing', 'shipped', 'delivered'] as const
type OrderStatus = (typeof STATUS_OPTIONS)[number]

const labelFor = (s: string) => (s === 'payment_review' ? 'needs review' : s)

const STATUS_COLOURS: Record<OrderStatus, string> = {
  payment_review: 'text-amber-300',
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
  // Shown next to the select instead of a browser pop-up
  const [error, setError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  async function saveStatus(newStatus: string, trackingNumber?: string) {
    const previous = status
    setSaving(true)
    setError(null)
    setJustSaved(false)

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
        setError(`Couldn’t change the status: ${body.error ?? res.statusText}. It’s still “${labelFor(previous)}”.`)
        setStatus(previous)
        return
      }

      setStatus(newStatus)
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2500)
    } catch {
      setError(`Couldn’t reach the server, so the status is still “${labelFor(previous)}”. Check your connection and try again.`)
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
          aria-label="Order status"
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `status-error-${orderId}` : undefined}
          className={`bg-stone-800 border border-stone-600 rounded px-2 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-gold disabled:opacity-50 disabled:cursor-not-allowed ${colourClass}`}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s} className={STATUS_COLOURS[s]}>
              {labelFor(s)}
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

      {justSaved && !saving && (
        <span role="status" className="text-xs text-green-300">
          Saved
        </span>
      )}
      {error && (
        <p id={`status-error-${orderId}`} role="alert" className="max-w-xs text-xs text-red-300">
          {error}
        </p>
      )}

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
