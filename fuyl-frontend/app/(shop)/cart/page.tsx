'use client'

import { CartLineItem } from '@/components/cart/CartLineItem'
import { CartSummary } from '@/components/cart/CartSummary'
import { CartEmpty } from '@/components/cart/CartEmpty'
import { useCart } from '@/lib/hooks/useCart'

export default function CartPage() {
  const { items } = useCart()

  if (!items.length) return (
    <div className="container-brand section-py">
      <CartEmpty />
    </div>
  )

  return (
    <div className="container-brand section-py">
      <h1 className="text-display-xl font-display mb-10">YOUR BAG</h1>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        {/* Line items */}
        <div className="lg:col-span-2">
          {items.map((item) => <CartLineItem key={item.id} item={item} />)}
        </div>
        {/* Summary */}
        <CartSummary />
      </div>
    </div>
  )
}
