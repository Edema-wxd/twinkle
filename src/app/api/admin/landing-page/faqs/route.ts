import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getAdminSession } from '@/lib/auth/server'
import { db, faqs } from '@/db'
import { DEFAULT_LANDING_FAQS, LANDING_FAQ_CATEGORY } from '@/lib/landing/config'
import { revalidateFaqs } from '@/lib/content-api'
import { revalidateLandingPage } from '../../_lib/revalidateLanding'

/**
 * "Add the draft FAQs" on Admin → Ad landing page: copies the draft questions
 * into Admin → FAQs under the "Landing page" category, in order, so they can be
 * edited there. Only while that category is empty, so a double click can't
 * add them twice.
 */
export async function POST() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [existing] = await db.select({ id: faqs.id }).from(faqs).where(eq(faqs.category, LANDING_FAQ_CATEGORY)).limit(1)
    if (existing) {
      return NextResponse.json({ error: 'The landing page already has FAQs. Edit them in Admin → FAQs.' }, { status: 409 })
    }

    const inserted = await db
      .insert(faqs)
      .values(
        DEFAULT_LANDING_FAQS.map((f, i) => ({
          category: LANDING_FAQ_CATEGORY,
          question: f.question,
          answer: f.answer,
          displayOrder: i,
          isFeatured: false,
        })),
      )
      .returning({ id: faqs.id, question: faqs.question, answer: faqs.answer, displayOrder: faqs.displayOrder })

    revalidateFaqs()
    revalidateLandingPage()
    return NextResponse.json({ faqs: inserted.sort((a, b) => a.displayOrder - b.displayOrder) }, { status: 201 })
  } catch (err) {
    console.error('[admin/landing-page/faqs] insert failed:', err)
    return NextResponse.json({ error: 'Could not add the draft FAQs. Please try again.' }, { status: 500 })
  }
}
