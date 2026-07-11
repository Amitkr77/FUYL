import { apiFetch } from './client'
import type { Cart, CartItem } from '@/types/cart'

// ─── Backend raw shapes (subset of fields this file uses) ──────────────────
// Mirrors fuyl-backend/src/modules/cart/models/cart.model.ts. There is no
// cart-ID concept in the API — identity is resolved server-side from the
// JWT (logged-in) or the `x-guest-id` header (guest), and every route acts
// on "the current cart" for that identity. Mutations are keyed by
// productId/variantId, not a separate line-item id.
interface BackendCartItem {
  productId: string
  variantId?: string
  name: string
  slug?: string
  image?: string
  unitPrice: number
  quantity: number
  subscriptionInterval?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly'
  subscriptionDiscountPercent?: number
}

interface BackendCart {
  _id: string
  items: BackendCartItem[]
  subtotal: number
  itemCount: number
}

export type CartAuth = { token?: string; guestId: string }

function mapCartItem(item: BackendCartItem): CartItem {
  return {
    id:           `${item.productId}:${item.variantId ?? ''}`,
    productId:    item.productId,
    variantId:    item.variantId ?? '',
    slug:         item.slug ?? '',
    name:         item.name,
    variantTitle: '', // backend stores no variant display name on the cart snapshot, only variantId
    price:        item.unitPrice,
    quantity:     item.quantity,
    image:        item.image ?? '',
    imageAlt:     item.name,
    subscriptionInterval:        item.subscriptionInterval,
    subscriptionDiscountPercent: item.subscriptionDiscountPercent,
  }
}

// GET /cart returns null (not a 404) when the identity has no cart yet —
// getOrCreateCart is only used by mutation endpoints, not the read endpoint.
function mapCart(raw: BackendCart | null): Cart {
  if (!raw) return { id: null, items: [], subtotal: 0, itemCount: 0 }
  return {
    id:        raw._id,
    items:     raw.items.map(mapCartItem),
    subtotal:  raw.subtotal,
    itemCount: raw.itemCount,
  }
}

export async function getCart(auth: CartAuth): Promise<Cart> {
  const raw = await apiFetch<BackendCart | null>('/cart', { token: auth.token, guestId: auth.guestId })
  return mapCart(raw)
}

export async function addCartItem(
  auth: CartAuth,
  payload: {
    productId: string
    variantId?: string
    quantity: number
    subscriptionInterval?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly'
    subscriptionDiscountPercent?: number
  }
): Promise<Cart> {
  const raw = await apiFetch<BackendCart>('/cart/items', {
    method: 'POST',
    body:   payload,
    token:  auth.token,
    guestId: auth.guestId,
  })
  return mapCart(raw)
}

export async function updateCartItem(
  auth: CartAuth,
  productId: string,
  variantId: string | undefined,
  quantity: number
): Promise<Cart> {
  const path = variantId ? `/cart/items/${productId}/${variantId}` : `/cart/items/${productId}`
  const raw = await apiFetch<BackendCart>(path, {
    method: 'PATCH',
    body:   { quantity },
    token:  auth.token,
    guestId: auth.guestId,
  })
  return mapCart(raw)
}

export async function removeCartItem(
  auth: CartAuth,
  productId: string,
  variantId?: string
): Promise<Cart> {
  const path = variantId ? `/cart/items/${productId}/${variantId}` : `/cart/items/${productId}`
  const raw = await apiFetch<BackendCart>(path, {
    method: 'DELETE',
    token:  auth.token,
    guestId: auth.guestId,
  })
  return mapCart(raw)
}

export async function clearCartRemote(auth: CartAuth): Promise<void> {
  await apiFetch<{ cleared: boolean }>('/cart', { method: 'DELETE', token: auth.token, guestId: auth.guestId })
}

// Merges the guest cart (by guestId) into the now-authenticated user's cart.
// Backend deletes the guest cart after merging, so this is safe to call
// once per login without needing to rotate guestId afterward.
export async function mergeCart(token: string, guestId: string): Promise<Cart> {
  const raw = await apiFetch<BackendCart | { merged: false; reason: string }>('/cart/merge', {
    method: 'POST',
    token,
    guestId,
  })
  return 'items' in raw ? mapCart(raw) : mapCart(null)
}
