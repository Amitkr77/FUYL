'use client'

import { useCartStore } from '@/lib/store/cartStore'

export function useCart() {
  const store = useCartStore()
  const itemCount = store.items.reduce((s, i) => s + i.quantity, 0)
  const subtotal  = store.items.reduce((s, i) => s + i.price * i.quantity, 0)

  return {
    ...store,
    itemCount,
    subtotal,
  }
}
