import { asc, isNotNull } from 'drizzle-orm'
import { db, products, blogPosts } from '@/db'
import type { PickerProduct } from '../_components/BlogPostForm'

/** Data the blog editor sidebar needs: products for "Shop the look" and existing categories. */
export async function getBlogEditorData(): Promise<{ products: PickerProduct[]; existingTags: string[] }> {
  try {
    const [productRows, tagRows] = await Promise.all([
      db
        .select({ id: products.id, name: products.name, slug: products.slug, image: products.image, priceMin: products.priceMin })
        .from(products)
        .orderBy(asc(products.name)),
      db.selectDistinct({ tag: blogPosts.tag }).from(blogPosts).where(isNotNull(blogPosts.tag)),
    ])
    return {
      products: productRows.map((p) => ({ id: p.id, name: p.name, slug: p.slug, image: p.image, price_min: p.priceMin })),
      existingTags: tagRows.map((t) => t.tag).filter((t): t is string => Boolean(t)).sort(),
    }
  } catch (err) {
    console.error('Failed to load blog editor data:', err)
    return { products: [], existingTags: [] }
  }
}
