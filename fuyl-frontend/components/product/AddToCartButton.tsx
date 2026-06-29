'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useCart } from '@/lib/hooks/useCart'
import type { Product, ProductVariant } from '@/types/product'

interface AddToCartButtonProps {
  product:  Product
  variant:  ProductVariant
  quantity: number
}

export function AddToCartButton({ product, variant, quantity }: AddToCartButtonProps) {
  const { addItem, isLoading } = useCart()
  const [added, setAdded] = useState(false)

  const handleAdd = async () => {
    if (!variant.available) return
    await addItem({
      productId:    product.id,
      variantId:    variant.id,
      slug:         product.slug,
      name:         product.name,
      variantTitle: variant.title,
      price:        variant.price,
      quantity,
      image:        product.images[0]?.url ?? '',
      imageAlt:     product.images[0]?.altText ?? product.name,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  if (!variant.available) {
    return (
      <Button variant="outline" size="lg" fullWidth disabled>
        Out of Stock
      </Button>
    )
  }

  return (
    <Button
      variant="primary"
      size="lg"
      fullWidth
      loading={isLoading && !added}
      onClick={handleAdd}
    >
      {added ? (
        <>
          <Check size={16} />
          Added to Bag
        </>
      ) : (
        'Add to Bag'
      )}
    </Button>
  )
}
