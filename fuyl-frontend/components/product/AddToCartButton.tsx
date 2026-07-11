'use client'

import { useState } from 'react'
import { Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useCart } from '@/lib/hooks/useCart'
import type { Product, ProductVariant } from '@/types/product'

interface AddToCartButtonProps {
  product:  Product
  variant:  ProductVariant
  quantity: number
  subscriptionInterval?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly'
  subscriptionDiscountPercent?: number
}

export function AddToCartButton({ product, variant, quantity, subscriptionInterval, subscriptionDiscountPercent }: AddToCartButtonProps) {
  const { addItem, isLoading } = useCart()
  const [added, setAdded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async () => {
    if (!variant.available) return
    setError(null)
    try {
      // Backend returns the authoritative name/price/image snapshot on every
      // cart mutation — the caller only needs to identify what to add.
      await addItem({
        productId: product.id,
        variantId: variant.id,
        quantity,
        subscriptionInterval,
        subscriptionDiscountPercent,
      })
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
    } catch (err) {
      // BUG FIXED (found live — reported as "add to cart isn't working"):
      // this had no error handling at all, so a failed add-to-cart call
      // (which cartStore.ts's addItem used to swallow silently) had no way
      // to reach the user. Now it does.
      setError(err instanceof Error ? err.message : 'Could not add this to your bag. Please try again.')
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
      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-body-xs" style={{ color: '#B91C1C' }}>
          <AlertCircle size={14} />
          {error}
        </p>
      )}
    </div>
  )
}
