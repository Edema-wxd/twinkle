import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAdminSession } from '@/lib/auth/server'
import { setStock } from '@/lib/stock'
import { db } from '@/db'
import { products } from '@/db'
import { isUniqueViolation } from '@/lib/db/errors'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function POST(req: NextRequest) {
  // Auth check — validate against auth server (not just local JWT)
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { name, slug: rawSlug, description, material, is_featured, is_active, variants } = body as {
    name?: unknown
    slug?: unknown
    description?: unknown
    material?: unknown
    is_featured?: unknown
    is_active?: unknown
    variants?: unknown
  }

  // Validate required fields
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const trimmedName = name.trim()
  const slug =
    rawSlug && typeof rawSlug === 'string' && rawSlug.trim() !== ''
      ? rawSlug.trim()
      : generateSlug(trimmedName)

  if (!slug) {
    return NextResponse.json({ error: 'slug could not be generated from name' }, { status: 400 })
  }

  // Validate material
  const validMaterials = ['Gold', 'Silver', 'Crystal', 'Tools']
  if (!material || typeof material !== 'string' || !validMaterials.includes(material)) {
    return NextResponse.json(
      { error: `material must be one of: ${validMaterials.join(', ')}` },
      { status: 400 }
    )
  }

  // Process variants — enforce price_tiers shape
  const rawVariants = Array.isArray(variants) ? variants : []
  const processedVariants = rawVariants.map((v: {
    id?: string
    name?: string
    price?: number
    in_stock?: boolean
    price_tiers?: Array<{ qty: number; price: number }>
  }) => {
    const price = typeof v.price === 'number' ? v.price : 0
    const tiers =
      Array.isArray(v.price_tiers) && v.price_tiers.length > 0
        ? v.price_tiers
        : [{ qty: 1, price }]
    return {
      id: v.id ?? crypto.randomUUID(),
      name: v.name ?? '',
      price,
      in_stock: typeof v.in_stock === 'boolean' ? v.in_stock : true,
      price_tiers: tiers,
    }
  })

  // Compute price_min / price_max from variants
  const allPrices = processedVariants.flatMap((v) => v.price_tiers.map((t) => t.price))
  const priceMin = allPrices.length > 0 ? Math.min(...allPrices) : 0
  const priceMax = allPrices.length > 0 ? Math.max(...allPrices) : 0

  try {
    const [data] = await db.insert(products).values({
      name: trimmedName,
      slug,
      description: typeof description === 'string' ? description : '',
      material,
      isFeatured: typeof is_featured === 'boolean' ? is_featured : false,
      isActive: typeof is_active === 'boolean' ? is_active : true,
      variants: processedVariants,
      priceMin,
      priceMax,
      image: '/images/products/placeholder-bead.svg',
      images: [],
    }).returning()

    if (data) {
      // Stock counts live in product_stock, not the variants JSON
      for (const c of stockChanges(rawVariants, processedVariants.map((v) => v.id))) {
        await setStock(data.id, c.variantId, c.units)
      }
    }

    if (!data) {
      return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
    }

    revalidatePath('/catalog')
    revalidatePath('/')
    return NextResponse.json(data, { status: 201 })
  } catch (err: unknown) {
    console.error('Failed to create product:', err)
    if (isUniqueViolation(err)) {
      return NextResponse.json({ error: 'A product with this slug already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}

/** Stock edits from the product form: only values the admin changed (vs. what the form loaded). */
function stockChanges(rawVariants: unknown[], ids: string[]): { variantId: string; units: number | null }[] {
  const out: { variantId: string; units: number | null }[] = []
  rawVariants.forEach((raw, i) => {
    const v = raw as { stock?: unknown; stock_loaded?: unknown }
    const norm = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? Math.max(0, Math.floor(x)) : null)
    const next = norm(v.stock)
    const loaded = norm(v.stock_loaded)
    if (next !== loaded) out.push({ variantId: ids[i], units: next })
  })
  return out
}
