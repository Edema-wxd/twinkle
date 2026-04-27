import type { Metadata } from 'next'
import { db, aboutSections as aboutSectionsTable } from '@/db'
import { asc } from 'drizzle-orm'
import { AboutSection } from '@/components/about/AboutSection'
import { AboutStickyNav } from '@/components/about/AboutStickyNav'
import { AboutSection as AboutSectionType } from '@/types/supabase'

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about Twinkle Locs — our founder story, brand mission, and why we create premium Nigerian loc bead accessories.',
  openGraph: {
    title: 'About Us | Twinkle Locs',
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
    id: 'why-loc-beads',
    title: 'Why Loc Beads',
    body: '<p>Loc beads are a beautiful way to express identity and culture through hair.</p>',
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
    <main>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="font-heading text-4xl lg:text-5xl font-bold text-charcoal">
          About Twinkle Locs
        </h1>

        <AboutStickyNav />

        <div className="mt-12 space-y-24">
          {sections.map((section) => (
            <AboutSection key={section.id} section={section} />
          ))}
        </div>
      </div>
    </main>
  )
}
