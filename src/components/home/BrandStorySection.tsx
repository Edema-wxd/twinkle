import Link from 'next/link';

export function BrandStorySection() {
  return (
    <section className="relative overflow-hidden bg-cream py-20 px-4">
      <div aria-hidden="true" className="absolute inset-0 bg-pattern-02 opacity-[0.05] pointer-events-none z-0" />
      <div className="relative z-10 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

        {/* Left column — text */}
        <div>
          <p className="font-body text-sm text-gold uppercase tracking-widest mb-3">
            Our Story
          </p>

          <h2 className="font-display text-4xl md:text-5xl text-forest leading-tight mb-6">
            Born from a love of locs
          </h2>

          <p className="font-body text-base text-charcoal/70 mb-4 leading-relaxed">
            Unoma has always loved jewellery she does not have to think about. When she started
            her loc journey in 2024, she wanted to carry that same ease into her hair.
          </p>

          <p className="font-body text-base text-charcoal/70 mb-8 leading-relaxed">
            She went deep researching fade-resistant beads, wore them herself, and the compliments
            followed everywhere. People kept saying: &ldquo;That sounds like too much trouble.&rdquo;
            So she did the trouble for them.
          </p>

          <Link
            href="/about"
            className="inline-flex items-center gap-2 font-heading font-semibold text-gold hover:text-forest transition-colors"
          >
            Read our story &rarr;
          </Link>
        </div>

        {/* Right column — image placeholder */}
        <div className="aspect-square w-full rounded-2xl bg-linear-to-br from-gold/20 via-forest/10 to-cream flex items-center justify-center">
          {/* TODO: Replace with real brand story photo */}
          <div className="font-display text-4xl text-gold/40 text-center">
            Twinkle Locs
          </div>
        </div>

      </div>
    </section>
  );
}
