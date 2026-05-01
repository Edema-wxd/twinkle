import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAdminSession } from '@/lib/auth/server'
import { db } from '@/db'
import { products } from '@/db'
import { eq } from 'drizzle-orm'
import { deleteUploadthingFilesByUrls } from '@/lib/uploadthing/server'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check — validate against auth server (not just local JWT)
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    name,
    slug,
    description,
    material,
    is_featured,
    is_active,
    variants,
    image,
    images,
  } = body as {
    name?: unknown
    slug?: unknown
    description?: unknown
    material?: unknown
    is_featured?: unknown
    is_active?: unknown
    variants?: unknown
    image?: unknown
    images?: unknown
  }

  // Validate required fields
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  if (!slug || typeof slug !== 'string' || slug.trim() === '') {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 })
  }

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

  // Recompute price_min / price_max
  const allPrices = processedVariants.flatMap((v) => v.price_tiers.map((t) => t.price))
  const priceMin = allPrices.length > 0 ? Math.min(...allPrices) : 0
  const priceMax = allPrices.length > 0 ? Math.max(...allPrices) : 0

  const updatePayload: Record<string, unknown> = {
    name: (name as string).trim(),
    slug: (slug as string).trim(),
    description: typeof description === 'string' ? description : '',
    material,
    isFeatured: typeof is_featured === 'boolean' ? is_featured : false,
    isActive: typeof is_active === 'boolean' ? is_active : true,
    variants: processedVariants,
    priceMin,
    priceMax,
  }

  if (typeof image === 'string') {
    updatePayload.image = image
  }
  if (Array.isArray(images)) {
    updatePayload.images = images
  }

  try {
    const [before] = await db
      .select({ images: products.images })
      .from(products)
      .where(eq(products.id, id))
      .limit(1)

    const [data] = await db
      .update(products)
      .set(updatePayload)
      .where(eq(products.id, id))
      .returning()

    if (!data) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Delete removed UploadThing files (best-effort; never touches legacy URLs).
    const prevImages = before?.images ?? []
    const nextImages = Array.isArray(images) ? images.filter((u): u is string => typeof u === 'string') : prevImages
    const removed = prevImages.filter((u) => !nextImages.includes(u))
    if (removed.length > 0) {
      try {
        await deleteUploadthingFilesByUrls(removed)
      } catch (err) {
        console.error('UploadThing cleanup failed (product images):', err)
      }
    }

    revalidatePath('/catalog')
    revalidatePath('/')
    revalidatePath(`/catalog/${data.slug}`)
    return NextResponse.json(data)
  } catch (err: unknown) {
    console.error('Failed to update product:', err)
    const pgErr = err as { code?: string }
    if (pgErr?.code === '23505') {
      return NextResponse.json({ error: 'A product with this slug already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check — validate against auth server (not just local JWT)
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const [before] = await db
      .select({ images: products.images })
      .from(products)
      .where(eq(products.id, id))
      .limit(1)

    await db.delete(products).where(eq(products.id, id))

    const prevImages = before?.images ?? []
    if (prevImages.length > 0) {
      try {
        await deleteUploadthingFilesByUrls(prevImages)
      } catch (err) {
        console.error('UploadThing cleanup failed (product delete):', err)
      }
    }

    revalidatePath('/catalog')
    revalidatePath('/')
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Failed to delete product:', err)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
