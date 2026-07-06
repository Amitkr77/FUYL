'use client'

import { useParams } from 'next/navigation'
import { getProductById } from '@/lib/mock-data'
import { ProductForm } from '@/components/products/ProductForm'

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>()
  const product = getProductById(id)

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-2xl font-bold text-slate-900 mb-2">Product not found</p>
        <p className="text-slate-500 text-sm">The product with ID &quot;{id}&quot; does not exist.</p>
      </div>
    )
  }

  return <ProductForm product={product} />
}
