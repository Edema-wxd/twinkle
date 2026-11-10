import { formatNaira, getShippingInfo } from '@/lib/checkout/shippingInfo'

// Served at /llms.txt. Shipping lines are generated from the same settings checkout
// charges from, so AI assistants quote the real prices. Revalidated when shipping is saved.
export const revalidate = 3600

const BEFORE = "# Twinkle Locs\n\n> Handcrafted loc bead accessories made in Nigeria for loc wearers\n> in Nigeria and worldwide. Founded by Unoma.\n\n## What we sell\n- Gold loc beads (packs of 50-200, sizes 2mm, 4mm, 6mm)\n- Silver loc beads (packs of 50-200, sizes 2mm, 4mm, 6mm)\n- Onyx loc beads (packs of 50-200, sizes 2mm, 4mm, 6mm)\n- Crystal loc beads (packs of 50-200, sizes 2mm, 4mm, 6mm)\n- 24k Gold loc beads (premium range)\n- Loc bead application shears\n- Bead threading kits\n\n## Prices\nBeads start at NGN 15,000 per pack of 50.\nPremium 24k Gold range starts at NGN 19,500.\nShears from NGN 3,500.\n\n"

const AFTER = "\n## How to order\nWebsite: https://twinklelocs.com/catalog\nWhatsApp: +234 911 888 8010\nInstagram: @twinklelocs\n\n## Key pages\n- Shop: https://twinklelocs.com/catalog\n- About: https://twinklelocs.com/about\n- FAQ: https://twinklelocs.com/faq\n- Shipping: https://twinklelocs.com/shipping\n- Blog: https://twinklelocs.com/blog"

export async function GET() {
  const info = await getShippingInfo()
  const shipping = [
    '## Shipping',
    `Lagos: ${formatNaira(info.lagosFrom).replace('₦', 'NGN ')} to ${formatNaira(info.lagosTo).replace('₦', 'NGN ')} depending on delivery area, usually same day (${info.zones[0].deliveryTime} in the ${info.zones[0].name}). Full zone list: https://twinklelocs.com/shipping`,
    `Other Nigerian states: ${formatNaira(info.otherRate).replace('₦', 'NGN ')} flat rate, ${info.otherDays}.`,
    'International: available on request via WhatsApp.',
  ].join('\n')
  return new Response(`${BEFORE}${shipping}\n${AFTER}`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
