'use client'

import { useEffect, useState } from 'react'
import { CartLineItem } from '@/components/cart/CartLineItem'
import { CartSummary } from '@/components/cart/CartSummary'
import { CartEmpty } from '@/components/cart/CartEmpty'
import { useCart } from '@/lib/hooks/useCart'

export default function CartPage() {
  const { items, syncCart } = useCart()
  const [synchronized, setSynchronized] = useState(false)

  // The persisted browser cart is only a fast visual cache. Checkout converts
  // the authoritative server cart as soon as an order is created, so always
  // reconcile before exposing cart actions. Otherwise browser Back can briefly
  // render stale line items that the API correctly reports as missing.
  useEffect(() => {
    let active = true
    syncCart().finally(() => {
      if (active) setSynchronized(true)
    })
    return () => { active = false }
  }, [syncCart])

  if (!synchronized) return (
    <div className="container-brand section-py" aria-live="polite">
      <div className="h-8 w-48 animate-pulse rounded-sm bg-brand-cream" />
      <div className="mt-10 h-40 animate-pulse rounded-sm bg-brand-cream" />
      <span className="sr-only">Refreshing your bag</span>
    </div>
  )

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
