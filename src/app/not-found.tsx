import Link from 'next/link'
import { BUSINESS } from '@/lib/config/business'

export default function NotFound() {
  return (
    <div className="relative overflow-hidden bg-forest">
      <div aria-hidden="true" className="absolute inset-0 bg-pattern-01 opacity-[0.06]" />
      <div className="relative mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 py-20 text-center">
        <p className="font-heading text-xs font-semibold uppercase tracking-[0.24em] text-gold-light">Error 404</p>
        <h1 className="mt-8 font-display text-6xl leading-[1.2] text-cream md:text-7xl">This bead rolled away</h1>
        <p className="mt-4 font-body text-cream/80">The page you&apos;re looking for has moved or no longer exists.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/catalog" className="inline-flex min-h-12 items-center rounded-lg bg-gold-light px-7 font-heading font-semibold text-forest hover:bg-cream transition-colors">
            Shop the collection
          </Link>
          <a
            href={BUSINESS.whatsapp.url('Hi, I was looking for something on your site')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center rounded-lg px-7 font-heading font-semibold text-cream ring-1 ring-cream/40 hover:bg-cream/10 transition-colors"
          >
            Ask on WhatsApp
          </a>
        </div>
        <Link href="/" className="mt-6 font-body text-sm text-cream/75 underline underline-offset-4 hover:text-cream">Back to home</Link>
      </div>
    </div>
  )
}
