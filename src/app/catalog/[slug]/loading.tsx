import Link from 'next/link'

/** Shown while a product loads: the same two-column layout with placeholders. */
export default function ProductLoading() {
  return (
    <div className="bg-cream min-h-screen" aria-busy="true">
      <p className="sr-only" role="status">Loading product…</p>
      <nav aria-label="Breadcrumb" className="max-w-6xl mx-auto px-4 pt-6 pb-0">
        <Link href="/catalog" className="text-forest underline decoration-gold underline-offset-2 hover:text-gold-deep font-body text-sm">
          Shop
        </Link>
      </nav>
      <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-2 gap-12" aria-hidden="true">
        <div className="aspect-square w-full rounded-xl bg-charcoal/5 animate-pulse" />
        <div className="space-y-4">
          <div className="h-5 w-16 rounded-full bg-charcoal/5" />
          <div className="h-10 w-2/3 rounded bg-charcoal/10" />
          <div className="h-7 w-1/3 rounded bg-charcoal/10" />
          <div className="space-y-2 pt-4">
            <div className="h-4 w-full rounded bg-charcoal/5" />
            <div className="h-4 w-5/6 rounded bg-charcoal/5" />
          </div>
          <div className="flex gap-2 pt-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-11 w-20 rounded-lg bg-white ring-1 ring-charcoal/10" />
            ))}
          </div>
          <div className="h-12 w-full rounded-lg bg-forest/20 mt-6" />
        </div>
      </div>
    </div>
  )
}
