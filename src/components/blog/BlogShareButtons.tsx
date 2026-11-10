'use client'

import { useState } from 'react'

interface BlogShareButtonsProps {
  title: string
  canonicalUrl: string
}

const btn =
  'inline-flex min-h-11 items-center gap-2 rounded-full px-4 font-heading text-sm font-medium text-forest ring-1 ring-forest/20 transition-colors hover:bg-forest hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold'

export function BlogShareButtons({ title, canonicalUrl }: BlogShareButtonsProps) {
  const [copied, setCopied] = useState(false)
  const waUrl = `https://wa.me/?text=${encodeURIComponent(`${title} ${canonicalUrl}`)}`
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(canonicalUrl)}`
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonicalUrl)}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(canonicalUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copy this link:', canonicalUrl)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 font-heading text-xs font-semibold uppercase tracking-[0.18em] text-charcoal/65">Share</span>
      <a href={waUrl} target="_blank" rel="noopener noreferrer" className={btn}>
        WhatsApp
      </a>
      <a href={xUrl} target="_blank" rel="noopener noreferrer" className={btn}>
        X
      </a>
      <a href={fbUrl} target="_blank" rel="noopener noreferrer" className={btn}>
        Facebook
      </a>
      <button type="button" onClick={copy} className={btn}>
        <span aria-live="polite">{copied ? 'Link copied' : 'Copy link'}</span>
      </button>
    </div>
  )
}
