'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { CartItem } from '@/types/cart'
import { addCartItem, updateCartItem, removeCartItem, createCart, getCheckoutUrl } from '@/lib/api/cart'

interface CartState {
  cartId:    string | null
  items:     CartItem[]
  isOpen:    boolean
  isLoading: boolean
  // Computed
  itemCount: number
  subtotal:  number
  // Actions
  openCart:   () => void
  closeCart:  () => void
  addItem:    (item: Omit<CartItem, 'id'>) => Promise<void>
  updateQty:  (lineItemId: string, quantity: number) => Promise<void>
  removeItem: (lineItemId: string) => Promise<void>
  clearCart:  () => void
  checkout:   () => Promise<void>
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cartId:    null,
      items:     [],
      isOpen:    false,
      isLoading: false,

      get itemCount() {
        return get().items.reduce((sum, item) => sum + item.quantity, 0)
      },
      get subtotal() {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      },

      openCart:  () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      addItem: async (newItem) => {
        set({ isLoading: true })
        try {
          let { cartId } = get()
          // Lazy cart creation
          if (!cartId) {
            const { id } = await createCart()
            cartId = id
            set({ cartId })
          }

          const cart = await addCartItem(cartId, {
            variantId: newItem.variantId,
            quantity:  newItem.quantity,
          })

          // Merge backend response (has real line item IDs) with local display data
          set((state) => {
            const existingIndex = state.items.findIndex(
              (i) => i.variantId === newItem.variantId
            )
            if (existingIndex > -1) {
              const updated = [...state.items]
              updated[existingIndex] = {
                ...updated[existingIndex],
                quantity: updated[existingIndex].quantity + newItem.quantity,
              }
              return { items: updated, isOpen: true }
            }
            return {
              items:  [...state.items, { ...newItem, id: cart.items.at(-1)?.id ?? Date.now().toString() }],
              isOpen: true,
            }
          })
        } catch (err) {
          console.error('addItem failed', err)
        } finally {
          set({ isLoading: false })
        }
      },

      updateQty: async (lineItemId, quantity) => {
        if (quantity < 1) return get().removeItem(lineItemId)
        const { cartId } = get()
        if (!cartId) return
        set({ isLoading: true })
        try {
          await updateCartItem(cartId, lineItemId, { quantity })
          set((state) => ({
            items: state.items.map((i) =>
              i.id === lineItemId ? { ...i, quantity } : i
            ),
          }))
        } finally {
          set({ isLoading: false })
        }
      },

      removeItem: async (lineItemId) => {
        const { cartId } = get()
        if (!cartId) return
        set({ isLoading: true })
        try {
          await removeCartItem(cartId, lineItemId)
          set((state) => ({
            items: state.items.filter((i) => i.id !== lineItemId),
          }))
        } finally {
          set({ isLoading: false })
        }
      },

      clearCart: () => set({ items: [], cartId: null }),

      checkout: async () => {
        const { cartId } = get()
        if (!cartId) return
        set({ isLoading: true })
        try {
          const { url } = await getCheckoutUrl(cartId)
          window.location.href = url
        } finally {
          set({ isLoading: false })
        }
      },
    }),
    {
      name:    'fuyl_cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        cartId: state.cartId,
        items:  state.items,
      }),
    }
  )
)
