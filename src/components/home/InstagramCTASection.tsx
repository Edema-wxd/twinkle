import { BUSINESS } from '@/lib/config/business';

export function InstagramCTASection() {
  return (
    <section className="relative overflow-hidden bg-forest py-20 px-4">
      <div aria-hidden="true" className="absolute inset-0 bg-pattern-02 opacity-[0.08] pointer-events-none z-0" />
      <div className="relative z-10 max-w-2xl mx-auto text-center">

        <span aria-hidden="true" className="text-gold-light text-3xl mb-4 block">✦</span>

        <h2 className="font-display text-4xl md:text-5xl text-gold-light leading-tight mb-4">
          Follow Our Journey
        </h2>

        <p className="font-body text-base text-cream/80 mb-2">
          See how customers style their Twinkle Locs beads. Tag us for a chance to be featured.
        </p>

        <span className="font-heading font-semibold text-gold-light text-lg mb-8 block">
          @{BUSINESS.instagram.handle}
        </span>

        <a
          href={BUSINESS.instagram.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center bg-gold-light text-forest font-heading font-semibold px-10 py-4 rounded-lg hover:bg-cream transition-colors text-base"
        >
          Follow on Instagram
        </a>

      </div>
    </section>
  );
}
