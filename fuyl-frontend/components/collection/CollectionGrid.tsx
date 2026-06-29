import { ProductCard } from './ProductCard'
import type { Product } from '@/types/product'

interface CollectionGridProps {
  products: Product[]
}

export function CollectionGrid({ products }: CollectionGridProps) {
  if (!products.length) {
    return (
      <div className="text-center py-20">
        <p className="text-display-md font-display">NO PRODUCTS FOUND</p>
        <p className="text-body-md mt-2" style={{ color: 'var(--color-brand-muted)' }}>
          Check back soon — new products are on the way.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
