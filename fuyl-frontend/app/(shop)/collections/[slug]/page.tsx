import { generateSEO } from '@/lib/utils/seo'
import { getCollection } from '@/lib/api/products'
import { CollectionGrid } from '@/components/collection/CollectionGrid'

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  try {
    const col = await getCollection(slug)
    return generateSEO({ title: col.title, description: col.description })
  } catch {
    return generateSEO({ title: 'Shop All' })
  }
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params

  // Graceful fallback while backend is being built
  let products: Awaited<ReturnType<typeof getCollection>>['products'] = []
  let title = 'Shop All'

  try {
    const col = await getCollection(slug)
    products  = col.products
    title     = col.title
  } catch {
    // Backend not yet available — show empty state
  }

  return (
    <div className="container-brand section-py">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-display-xl font-display">{title.toUpperCase()}</h1>
        <p className="text-body-md mt-2" style={{ color: 'var(--color-brand-muted)' }}>
          {products.length} {products.length === 1 ? 'product' : 'products'}
        </p>
      </div>

      <CollectionGrid products={products} />
    </div>
  )
}
