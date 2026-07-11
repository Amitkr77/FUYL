'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useCart } from '@/lib/hooks/useCart'
import type { Product, ProductVariant } from '@/types/product'

interface BuyNowButtonProps {
  product:  Product
  variant:  ProductVariant
  quantity: number
  subscriptionInterval?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly'
  subscriptionDiscountPercent?: number
}

// Adds the item to the bag, same as AddToCartButton, then goes straight to
// checkout instead of staying on the PDP — no separate express-checkout
// flow, checkout already reads whatever's in the cart.
export function BuyNowButton({ product, variant, quantity, subscriptionInterval, subscriptionDiscountPercent }: BuyNowButtonProps) {
  const router = useRouter()
  const { addItem, isLoading } = useCart()
  const [error, setError] = useState<string | null>(null)

  const handleBuyNow = async () => {
    if (!variant.available) return
    setError(null)
    try {
      await addItem({
        productId: product.id,
        variantId: variant.id,
        quantity,
        subscriptionInterval,
        subscriptionDiscountPercent,
      })
      router.push('/checkout')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout. Please try again.')
    }
  }

  if (!variant.available) return null

  return (
    <div>
      <Button variant="outline" size="lg" fullWidth loading={isLoading} onClick={handleBuyNow}>
        Buy Now
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
