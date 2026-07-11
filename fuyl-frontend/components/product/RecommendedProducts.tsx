import { getProducts } from '@/lib/api/products'
import { ProductCard } from '@/components/collection/ProductCard'

interface RecommendedProductsProps {
  excludeProductId: string
}

// No recommendation engine exists on the backend — this is "more from the
// catalog" (other published products), not personalization.
export async function RecommendedProducts({ excludeProductId }: RecommendedProductsProps) {
  let products: Awaited<ReturnType<typeof getProducts>> = []
  try {
    products = (await getProducts({ limit: 8 })).filter((p) => p.id !== excludeProductId).slice(0, 4)
  } catch {
    products = []
  }

  if (!products.length) return null

  return (
    <div className="border-t pt-10" style={{ borderColor: 'var(--color-brand-border)' }}>
      <h2 className="text-display-md font-display mb-6 text-brand-forest">We Also Recommend</h2>
      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        {products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  )
}
