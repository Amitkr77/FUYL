'use client'

import { useState } from 'react'
import { Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useCartStore } from '@/lib/store/cartStore'
import type { Product, ProductVariant } from '@/types/product'
import { getErrorMessage } from '@/lib/api/client'

interface AddToCartButtonProps {
  product:  Product
  variant:  ProductVariant
  quantity: number
  subscriptionInterval?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly'
  subscriptionDiscountPercent?: number
}

export function AddToCartButton({ product, variant, quantity, subscriptionInterval, subscriptionDiscountPercent }: AddToCartButtonProps) {
  const { addItem } = useCartStore()
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async () => {
    if (!variant.available) return
    setError(null)
    setLoading(true)
    try {
      await addItem({
        productId: product.id,
        variantId: variant.id || undefined,
        quantity,
        subscriptionInterval,
        subscriptionDiscountPercent,
      })
      useCartStore.getState().openCart()
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not add this to your bag. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  if (!variant.available) {
    return (
      <Button variant="outline" size="lg" fullWidth disabled>
        Out of Stock
      </Button>
    )
  }

  return (
    <div>
      <Button
        variant="primary"
        size="lg"
        fullWidth
        loading={loading && !added}
        onClick={handleAdd}
      >
        {added ? (
          <>
            <Check size={16} />
            Added to Bag
          </>
        ) : (
          'Add to Cart'
        )}
      </Button>
      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-body-xs" style={{ color: '#B91C1C' }}>
          <AlertCircle size={14} />
          {error}
        </p>
      )}
    </div>
  )
}
