import { eq } from 'drizzle-orm'
import { db, products as productsTable } from '@/db'
import { formatNaira, getShippingInfo } from '@/lib/checkout/shippingInfo'
import type { ProductVariant } from '@/lib/types/product'
import { fromPrice } from '@/components/product/storeCopy'

// Served at /llms.txt. Prices come from the live products and shipping lines from the
// same settings checkout charges from, so AI assistants quote the real prices.
// Revalidated when shipping is saved, and at least hourly for product price changes.
export const revalidate = 3600

const SITE = 'https://twinklelocs.com'

const BEFORE = "# Twinkle Locs\n\n> Handcrafted loc bead accessories made in Nigeria for loc wearers\n> in Nigeria and worldwide. Founded by Unoma.\n\n## What we sell\n- Gold loc beads (packs of 50-200, sizes 2mm, 4mm, 6mm)\n- Silver loc beads (packs of 50-200, sizes 2mm, 4mm, 6mm)\n- Crystal loc beads (packs of 50-200, sizes 2mm, 4mm, 6mm)\n- 24k Gold loc beads (premium range)\n- Loc bead application shears\n- Bead threading kits\n\n"

const AFTER = "\n## How to order\nWebsite: https://twinklelocs.com\nWhatsApp: +234 911 888 8010\nInstagram: @twinklelocs\n\n## Key pages\n- Shop: https://twinklelocs.com\n- About: https://twinklelocs.com/about\n- FAQ: https://twinklelocs.com/faq\n- Shipping: https://twinklelocs.com/shipping\n- Returns & refunds: https://twinklelocs.com/returns\n- Privacy: https://twinklelocs.com/privacy\n- Blog: https://twinklelocs.com/blog"

/** "## Prices" with each product on sale and its lowest pack price, cheapest first. Never throws. */
async function pricesSection(): Promise<string> {
  const fallback = `## Prices\nIn Nigerian naira (₦). Current prices for every size and pack: ${SITE}\n\n`
  try {
    const rows = await db
      .select({ name: productsTable.name, slug: productsTable.slug, priceMin: productsTable.priceMin, variants: productsTable.variants })
      .from(productsTable)
      .where(eq(productsTable.isActive, true))
    const lines = rows
      .map((r) => ({ ...r, from: fromPrice({ price_min: r.priceMin, variants: r.variants as unknown as ProductVariant[] }) }))
      .filter((r): r is typeof r & { from: number } => r.from !== null)
      .sort((a, b) => a.from - b.from)
      .map((r) => `- ${r.name}: from ${formatNaira(r.from)} (${SITE}/catalog/${r.slug})`)
    if (lines.length === 0) return fallback
    return ['## Prices', 'In Nigerian naira (₦), cheapest in-stock size and pack for each product.', ...lines].join('\n') + '\n\n'
  } catch (err) {
    console.error('[llms.txt] Failed to load product prices:', err)
    return fallback
  }
}

export async function GET() {
  const [info, prices] = await Promise.all([getShippingInfo(), pricesSection()])
  const shipping = [
    '## Shipping',
    `Lagos: ${formatNaira(info.lagosFrom)} to ${formatNaira(info.lagosTo)} depending on delivery area, usually same day (${info.zones[0].deliveryTime} in the ${info.zones[0].name}). Full zone list: ${SITE}/shipping`,
    `Other Nigerian states: ${formatNaira(info.otherRate)} flat rate, ${info.otherDays}.`,
    'International: available on request via WhatsApp.',
  ].join('\n')
  return new Response(`${BEFORE}${prices}${shipping}\n${AFTER}`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
