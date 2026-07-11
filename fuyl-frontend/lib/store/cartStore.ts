'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { CartItem } from '@/types/cart'
import {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCartRemote,
  mergeCart,
} from '@/lib/api/cart'
import { useAuthStore } from './authStore'

interface CartState {
  guestId:   string | null
  items:     CartItem[]
  isOpen:    boolean
  isLoading: boolean
  // Computed
  itemCount: number
  subtotal:  number
  // Actions
  openCart:       () => void
  closeCart:      () => void
  addItem:        (input: {
    productId: string
    variantId?: string
    quantity: number
    subscriptionInterval?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly'
    subscriptionDiscountPercent?: number
  }) => Promise<void>
  updateQty:      (productId: string, variantId: string | undefined, quantity: number) => Promise<void>
  removeItem:     (productId: string, variantId?: string) => Promise<void>
  clearCart:      () => Promise<void>
  syncCart:       () => Promise<void>
  mergeGuestCart: () => Promise<void>
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => {
      // Lazily generate + persist a guest identity — this is what the
      // backend's `x-guest-id` header uses to resolve "the current cart"
      // for a not-logged-in visitor. Generated once per browser.
      function ensureGuestId(): string {
        const existing = get().guestId
        if (existing) return existing
        const id = crypto.randomUUID()
        set({ guestId: id })
        return id
      }

      function currentAuth() {
        return { token: useAuthStore.getState().token ?? undefined, guestId: ensureGuestId() }
      }

      return {
        guestId:   null,
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

        addItem: async (input) => {
          set({ isLoading: true })
          try {
            const cart = await addCartItem(currentAuth(), input)
            set({ items: cart.items, isOpen: true })
          } finally {
            set({ isLoading: false })
          }
          // BUG FIXED (found live — reported as "add to cart isn't
          // working"): this used to catch-and-log the error here, which
          // meant the promise returned to the caller always resolved
          // successfully even when the API call failed. AddToCartButton
          // would then show "Added to Bag" regardless of whether anything
          // was actually added. Errors now propagate so the button can
          // show what really happened.
        },

        updateQty: async (productId, variantId, quantity) => {
          if (quantity < 1) return get().removeItem(productId, variantId)
          set({ isLoading: true })
          try {
            const cart = await updateCartItem(currentAuth(), productId, variantId, quantity)
            set({ items: cart.items })
          } finally {
            set({ isLoading: false })
          }
        },

        removeItem: async (productId, variantId) => {
          set({ isLoading: true })
          try {
            const cart = await removeCartItem(currentAuth(), productId, variantId)
            set({ items: cart.items })
          } finally {
            set({ isLoading: false })
          }
        },

        clearCart: async () => {
          set({ isLoading: true })
          try {
            await clearCartRemote(currentAuth())
            set({ items: [] })
          } finally {
            set({ isLoading: false })
          }
        },

        // Reconcile local state with the backend's cart — call once on app
        // mount so a returning visitor (or an expired/rotated session)
        // doesn't keep trusting stale localStorage data indefinitely.
        syncCart: async () => {
          try {
            const cart = await getCart(currentAuth())
            set({ items: cart.items })
          } catch (err) {
            console.error('syncCart failed', err)
          }
        },

        // Call once right after a successful login/register — folds any
        // items added while browsing as a guest into the user's real cart.
        mergeGuestCart: async () => {
          const { guestId } = get()
          const token = useAuthStore.getState().token
          if (!guestId || !token) return
          try {
            const cart = await mergeCart(token, guestId)
            set({ items: cart.items })
          } catch (err) {
            console.error('mergeGuestCart failed', err)
          }
        },
      }
    },
    {
      name:    'fuyl_cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        guestId: state.guestId,
        items:   state.items,
      }),
    }
  )
)
