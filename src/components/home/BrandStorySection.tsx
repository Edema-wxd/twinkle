import Link from 'next/link';

export function BrandStorySection() {
  return (
    <section className="bg-cream py-20 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

        {/* Left column — text */}
        <div>
          <p className="font-body text-sm text-terracotta uppercase tracking-widest mb-3">
            Our Story
          </p>

          <h2 className="font-display text-4xl md:text-5xl text-cocoa leading-tight mb-6">
            Born from Love for Locs
          </h2>

          {/* TODO: Replace with real content from Unoma */}
          <p className="font-body text-base text-charcoal/70 mb-4 leading-relaxed">
            Twinkle Locs was founded by Unoma, a loc wearer who couldn&apos;t find bead accessories
            that matched the beauty and pride she felt in her hair journey.
          </p>

          {/* TODO: Replace with real content from Unoma */}
          <p className="font-body text-base text-charcoal/70 mb-8 leading-relaxed">
            Every bead is carefully selected and crafted to celebrate African hair culture &mdash;
            bringing a touch of luxury to the everyday loc experience.
          </p>

          <Link
            href="/about"
            className="inline-flex items-center gap-2 font-heading font-semibold text-terracotta hover:text-cocoa transition-colors"
          >
            Read our story &rarr;
          </Link>
        </div>

        {/* Right column — image placeholder */}
        <div className="aspect-square w-full rounded-2xl bg-linear-to-br from-gold/20 via-cocoa/10 to-terracotta/10 flex items-center justify-center">
          {/* TODO: Replace with real brand story photo */}
          <div className="font-display text-4xl text-gold/40 text-center">
            Twinkle Locs
          </div>
        </div>

      </div>
    </section>
  );
}
