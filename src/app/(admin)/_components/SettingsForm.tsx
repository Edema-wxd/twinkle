'use client'

import { useState, useTransition } from 'react'

interface SettingsFormProps {
  settings: Record<string, string>
}

export function SettingsForm({ settings }: SettingsFormProps) {
  // Store details
  const [storeName, setStoreName] = useState(settings.store_name ?? '')
  const [storeTagline, setStoreTagline] = useState(settings.store_tagline ?? '')
  const [email, setEmail] = useState(settings.email ?? '')
  const [address, setAddress] = useState(settings.address ?? '')

  // Contact & business
  const [whatsappNumber, setWhatsappNumber] = useState(settings.whatsapp_number ?? '')
  const [shippingFlatRate, setShippingFlatRate] = useState(settings.shipping_flat_rate ?? '')

  // Social links
  const [instagramUrl, setInstagramUrl] = useState(settings.instagram_url ?? '')
  const [tiktokUrl, setTiktokUrl] = useState(settings.tiktok_url ?? '')
  const [facebookUrl, setFacebookUrl] = useState(settings.facebook_url ?? '')

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            store_name: storeName,
            store_tagline: storeTagline,
            email: email,
            address: address,
            whatsapp_number: whatsappNumber,
            shipping_flat_rate: shippingFlatRate,
            instagram_url: instagramUrl,
            tiktok_url: tiktokUrl,
            facebook_url: facebookUrl,
          }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          showToast('error', data.error ?? 'Error saving settings')
          return
        }

        showToast('success', 'Settings saved')
      } catch {
        showToast('error', 'Network error — please try again')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Toast */}
      {toast && (
        <div
          className={`px-4 py-3 rounded-lg text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-emerald-900/60 text-emerald-300 ring-1 ring-emerald-600/40'
              : 'bg-red-900/60 text-red-300 ring-1 ring-red-600/40'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Store Details */}
      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
            Store Details
          </p>
          <div className="mt-2 border-t border-stone-700" />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-stone-300">Store name</label>
          <input
            type="text"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="Twinkle Locs"
            className="w-full px-3 py-2 bg-stone-800 border border-stone-600 text-white placeholder-stone-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-stone-300">Tagline</label>
          <input
            type="text"
            value={storeTagline}
            onChange={(e) => setStoreTagline(e.target.value)}
            placeholder="Adorn your locs"
            className="w-full px-3 py-2 bg-stone-800 border border-stone-600 text-white placeholder-stone-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-stone-300">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="hello@twinklelocs.com"
            className="w-full px-3 py-2 bg-stone-800 border border-stone-600 text-white placeholder-stone-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-stone-300">Address</label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Lagos, Nigeria"
            rows={2}
            className="w-full px-3 py-2 bg-stone-800 border border-stone-600 text-white placeholder-stone-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold resize-y"
          />
        </div>
      </section>

      {/* Contact & Business */}
      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
            Contact &amp; Business
          </p>
          <div className="mt-2 border-t border-stone-700" />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-stone-300">WhatsApp number</label>
          <input
            type="text"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="+2349118888010"
            className="w-full px-3 py-2 bg-stone-800 border border-stone-600 text-white placeholder-stone-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold"
          />
          <p className="text-xs text-stone-500">Include country code, e.g. +2349118888010</p>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-stone-300">Shipping flat rate (₦)</label>
          <input
            type="number"
            value={shippingFlatRate}
            onChange={(e) => setShippingFlatRate(e.target.value)}
            placeholder="3000"
            min="0"
            step="100"
            className="w-full px-3 py-2 bg-stone-800 border border-stone-600 text-white placeholder-stone-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold"
          />
          <p className="text-xs text-stone-500">
            Applied to all orders (override per-state logic not supported in v1)
          </p>
        </div>
      </section>

      {/* Social Links */}
      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
            Social Links
          </p>
          <div className="mt-2 border-t border-stone-700" />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-stone-300">Instagram URL</label>
          <input
            type="url"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            placeholder="https://instagram.com/twinklelocs"
            className="w-full px-3 py-2 bg-stone-800 border border-stone-600 text-white placeholder-stone-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-stone-300">TikTok URL</label>
          <input
            type="url"
            value={tiktokUrl}
            onChange={(e) => setTiktokUrl(e.target.value)}
            placeholder="https://tiktok.com/@twinklelocs"
            className="w-full px-3 py-2 bg-stone-800 border border-stone-600 text-white placeholder-stone-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-stone-300">Facebook URL</label>
          <input
            type="url"
            value={facebookUrl}
            onChange={(e) => setFacebookUrl(e.target.value)}
            placeholder="https://facebook.com/twinklelocs"
            className="w-full px-3 py-2 bg-stone-800 border border-stone-600 text-white placeholder-stone-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold"
          />
        </div>
      </section>

      {/* Save */}
      <button
        type="submit"
        disabled={isPending}
        className="px-6 py-2.5 bg-gold hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
      >
        {isPending ? 'Saving…' : 'Save settings'}
      </button>
    </form>
  )
}
