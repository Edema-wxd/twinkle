import { BUSINESS } from '@/lib/config/business';

export function InstagramCTASection() {
  return (
    <section className="bg-cocoa py-20 px-4">
      <div className="max-w-2xl mx-auto text-center">

        <span className="text-gold/60 text-3xl mb-4 block">✦</span>

        <h2 className="font-display text-4xl md:text-5xl text-gold leading-tight mb-4">
          Follow Our Journey
        </h2>

        <p className="font-body text-base text-cream/70 mb-2">
          See how customers style their Twinkle Locs beads. Tag us for a chance to be featured.
        </p>

        <span className="font-heading font-semibold text-gold text-lg mb-8 block">
          @{BUSINESS.instagram.handle}
        </span>

        <a
          href={BUSINESS.instagram.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-gold text-cocoa font-heading font-semibold px-10 py-4 rounded-lg hover:bg-terracotta hover:text-cream transition-colors text-base"
        >
          Follow on Instagram
        </a>

      </div>
    </section>
  );
}
