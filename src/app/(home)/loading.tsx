/** Shown while the shop loads: the real heading plus card placeholders in the same grid. */
export default function CatalogLoading() {
  return (
    <div className="bg-cream min-h-screen" aria-busy="true">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="font-display text-4xl md:text-5xl text-forest mb-2">The Collection</h1>
        <p className="font-body text-charcoal/60 mb-8">Premium loc bead accessories, handcrafted in Nigeria.</p>
        <p className="sr-only" role="status">Loading products…</p>

        <div className="flex gap-3 flex-wrap mb-8 items-center" aria-hidden="true">
          <div className="flex-1 min-w-[200px] h-11 rounded-lg bg-white ring-1 ring-charcoal/10" />
          <div className="hidden md:flex gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-9 w-20 rounded-full bg-charcoal/5" />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl overflow-hidden">
              <div className="aspect-square w-full bg-charcoal/5 animate-pulse" />
              <div className="p-3 sm:p-4 space-y-2">
                <div className="h-4 w-16 rounded-full bg-charcoal/5" />
                <div className="h-5 w-3/4 rounded bg-charcoal/10" />
                <div className="h-4 w-1/3 rounded bg-charcoal/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
