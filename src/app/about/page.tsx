import type { Metadata } from 'next'
import { db, aboutSections as aboutSectionsTable, testimonials as testimonialsTable } from '@/db'
import { asc, eq } from 'drizzle-orm'
import { TestimonialsSection, type Testimonial } from '@/components/about/TestimonialsSection'
import { AboutSection } from '@/components/about/AboutSection'
import { AboutStickyNav } from '@/components/about/AboutStickyNav'
import { AboutSection as AboutSectionType } from '@/types/db'

export const metadata: Metadata = {
  title: { absolute: 'About Twinkle Locs - Handcrafted Loc Beads from Nigeria' },
  description: 'Learn about Twinkle Locs — our founder story, brand mission, and why we create premium Nigerian loc bead accessories.',
  openGraph: {
    title: 'About Twinkle Locs - Handcrafted Loc Beads from Nigeria',
    description: 'The story behind Twinkle Locs — handcrafted Nigerian loc bead accessories.',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
    type: 'website',
  },
}

const FALLBACK_SECTIONS: AboutSectionType[] = [
  {
    id: 'founder-story',
    title: 'Founder Story',
    body: '<p>Our story is coming soon. Check back for updates.</p>',
    image_url: null,
    display_order: 0,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'brand-mission',
    title: 'Brand Mission',
    body: '<p>We are on a mission to celebrate and adorn locs across Nigeria and the diaspora.</p>',
    image_url: null,
    display_order: 1,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'why-twinkles',
    title: 'Why Twinkles',
    body: '<p>Twinkles are a beautiful way to express identity and culture through hair.</p>',
    image_url: null,
    display_order: 2,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'contact',
    title: 'Contact',
    body: '<p>We&apos;d love to hear from you. Reach out via WhatsApp.</p>',
    image_url: null,
    display_order: 3,
    updated_at: new Date().toISOString(),
  },
]

export default async function AboutPage() {
  let rows: typeof aboutSectionsTable.$inferSelect[] = []
  try {
    rows = await db
      .select()
      .from(aboutSectionsTable)
      .orderBy(asc(aboutSectionsTable.displayOrder))
  } catch (err) {
    console.error('Failed to fetch about_sections:', err)
  }

  // Customer testimonials (Admin → Testimonials); the section hides itself when there are none
  let testimonials: Testimonial[] = []
  try {
    testimonials = (
      await db
        .select({ id: testimonialsTable.id, name: testimonialsTable.name, quote: testimonialsTable.quote })
        .from(testimonialsTable)
        .where(eq(testimonialsTable.isActive, true))
        .orderBy(asc(testimonialsTable.displayOrder))
    )
  } catch (err) {
    console.error('Failed to fetch testimonials:', err)
  }

  // Map Drizzle camelCase to snake_case shape expected by AboutSection component
  const sections: AboutSectionType[] =
    rows.length > 0
      ? rows.map((r) => ({
          id: r.id,
          title: r.title,
          body: r.body,
          image_url: r.imageUrl,
          display_order: r.displayOrder,
          updated_at: r.updatedAt.toISOString(),
        }))
      : FALLBACK_SECTIONS

  return (
    <div>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <p className="font-heading text-xs font-semibold uppercase tracking-[0.2em] text-gold-deep">Our story</p>
        <h1 className="mt-6 font-display text-5xl lg:text-6xl leading-[1.2] text-forest">
          About Twinkle Locs
        </h1>

        <AboutStickyNav sections={sections.map(({ id, title }) => ({ id, title }))} />

        <div className="mt-12 space-y-24">
          {sections.map((section) => (
            <AboutSection key={section.id} section={section} />
          ))}
        </div>
      </div>

      <div className="mt-24">
        <TestimonialsSection testimonials={testimonials} />
      </div>
    </div>
  )
}
