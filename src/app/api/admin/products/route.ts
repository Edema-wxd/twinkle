import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { products } from '@/db'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function POST(req: NextRequest) {
  // Auth check — validate against auth server (not just local JWT)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
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

    if (!data) {
      return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err: unknown) {
    console.error('Failed to create product:', err)
    const pgErr = err as { code?: string }
    if (pgErr?.code === '23505') {
      return NextResponse.json({ error: 'A product with this slug already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
