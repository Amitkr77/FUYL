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

// Pending debounce timers keyed by "productId:variantId" — one per line item.
// A timer fires when no further updateQty call for that item arrives within
// QTY_DEBOUNCE_MS, at which point the single batched PATCH is sent.
const qtyTimers = new Map<string, ReturnType<typeof setTimeout>>()
const qtyVersions = new Map<string, number>()
const QTY_DEBOUNCE_MS = 300

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

        // Does NOT open the cart drawer itself — that used to be a blanket
        // side effect here, which meant BuyNowButton (add + navigate
        // straight to checkout) triggered the drawer opening at the same
        // instant it navigated away. Callers that want the drawer to open
        // (AddToCartButton, the wishlist page) call openCart() themselves
        // right after a successful add; BuyNowButton deliberately doesn't.
        addItem: async (input) => {
          const cart = await addCartItem(currentAuth(), input)
          set({ items: cart.items })
          // BUG FIXED (found live — reported as "add to cart isn't
          // working"): this used to catch-and-log the error here, which
          // meant the promise returned to the caller always resolved
          // successfully even when the API call failed. AddToCartButton
          // would then show "Added to Bag" regardless of whether anything
          // was actually added. Errors now propagate so the button can
          // show what really happened.
        },

        // Optimistic: update the line locally right away so the UI feels
        // instant, then debounce the actual PATCH so rapid +/− clicks
        // collapse into a single server request. Without the debounce, each
        // click fires a PATCH and the last *response to arrive* (not the last
        // *request sent*) wins — so a slow earlier response can silently
        // overwrite a newer optimistic state and decrement the visible qty.
        updateQty: async (productId, variantId, quantity) => {
          if (quantity < 1) return get().removeItem(productId, variantId)

          const key = `${productId}:${variantId ?? ''}`
          const version = (qtyVersions.get(key) ?? 0) + 1
          qtyVersions.set(key, version)
          const matches = (i: CartItem) =>
            i.productId === productId && (i.variantId || '') === (variantId || '')

          // Apply optimistic update immediately so the UI is always in sync
          // with what the user intends, regardless of debounce timing.
          set({ items: get().items.map((i) => (matches(i) ? { ...i, quantity } : i)) })

          // Cancel any in-flight debounce for this line item and schedule a
          // fresh one. Only the timer that fires actually sends a request, so
          // intermediate values are never sent to the server.
          if (qtyTimers.has(key)) clearTimeout(qtyTimers.get(key)!)
          await new Promise<void>((resolve, reject) => {
            qtyTimers.set(key, setTimeout(async () => {
              qtyTimers.delete(key)
              // Re-read the current quantity at fire time — may have changed
              // further during the debounce window (e.g. user kept clicking).
              const currentQty = get().items.find((i) => matches(i))?.quantity ?? quantity
              const previous = get().items
              try {
                const cart = await updateCartItem(currentAuth(), productId, variantId, currentQty)
                // A request already in flight may finish after a newer click.
                // Never let that stale response overwrite the latest intent.
                if (qtyVersions.get(key) === version) set({ items: cart.items })
                resolve()
              } catch (err) {
                // Roll back the optimistic update so the UI shows the real
                // quantity, then re-sync so we don't stay in a stale state.
                if (qtyVersions.get(key) === version) {
                  set({ items: previous })
                  void get().syncCart()
                }
                reject(err)
              }
            }, QTY_DEBOUNCE_MS))
          })
        },

        removeItem: async (productId, variantId) => {
          const previous = get().items
          const matches = (i: CartItem) =>
            i.productId === productId && (i.variantId || '') === (variantId || '')
          set({ items: previous.filter((i) => !matches(i)) })
          try {
            const cart = await removeCartItem(currentAuth(), productId, variantId)
            set({ items: cart.items })
          } catch (err) {
            console.error('removeItem failed — reverting', err)
            set({ items: previous })
            void get().syncCart()
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
