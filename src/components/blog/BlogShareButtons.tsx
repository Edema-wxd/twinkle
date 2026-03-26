'use client'

interface BlogShareButtonsProps {
  title: string
  canonicalUrl: string
}

export function BlogShareButtons({ title, canonicalUrl }: BlogShareButtonsProps) {
  const waUrl = `https://wa.me/?text=${encodeURIComponent(title + ' ' + canonicalUrl)}`
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(canonicalUrl)}`

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-charcoal/60 font-medium">Share:</span>
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-stone-300 text-sm text-charcoal hover:border-[var(--color-gold,#C9A84C)] hover:text-[var(--color-gold,#C9A84C)] transition-colors"
      >
        WhatsApp
      </a>
      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-stone-300 text-sm text-charcoal hover:border-[var(--color-gold,#C9A84C)] hover:text-[var(--color-gold,#C9A84C)] transition-colors"
      >
        X / Twitter
      </a>
    </div>
  )
}
