import Link from 'next/link';

export function BrandStorySection() {
  return (
    <section className="relative overflow-hidden bg-cream py-20 px-4">
      <div aria-hidden="true" className="absolute inset-0 bg-pattern-02 opacity-[0.05] pointer-events-none z-0" />
      <div className="relative z-10 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

        {/* Left column — text */}
        <div>
          <p className="font-heading text-xs font-semibold text-gold-deep uppercase tracking-[0.2em] mb-6">
            Our Story
          </p>

          <h2 className="font-display text-4xl md:text-5xl text-forest leading-[1.2] mb-6">
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
            className="inline-flex min-h-11 items-center gap-2 font-heading font-semibold text-forest underline decoration-gold decoration-2 underline-offset-4 hover:text-gold-deep transition-colors"
          >
            Read our story &rarr;
          </Link>
        </div>

        {/* Right column — brand panel. Swap for a founder photo (next/image) when one is available. */}
        <figure className="relative aspect-square w-full overflow-hidden rounded-3xl bg-forest p-10 flex flex-col justify-end">
          <div aria-hidden="true" className="absolute inset-0 bg-pattern-02 opacity-[0.12]" />
          <span aria-hidden="true" className="relative font-display text-8xl leading-none text-gold-light/80">&ldquo;</span>
          <blockquote className="relative font-heading text-2xl md:text-3xl font-medium leading-snug text-cream text-balance">
            Jewellery you don&apos;t have to think about, for hair you love.
          </blockquote>
          <figcaption className="relative mt-6 font-heading text-xs font-semibold uppercase tracking-[0.2em] text-gold-light">
            Unoma, founder
          </figcaption>
        </figure>

      </div>
    </section>
  );
}
