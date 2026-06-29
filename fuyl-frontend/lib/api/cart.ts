import { apiFetch } from './client'
import type { Cart, CartItem } from '@/types/cart'

export async function createCart(): Promise<{ id: string }> {
  return apiFetch('/cart', { method: 'POST' })
}

export async function getCart(cartId: string): Promise<Cart> {
  return apiFetch(`/cart/${cartId}`)
}

export async function addCartItem(
  cartId: string,
  payload: { variantId: string; quantity: number }
): Promise<Cart> {
  return apiFetch(`/cart/${cartId}/items`, {
    method: 'POST',
    body:   payload,
  })
}

export async function updateCartItem(
  cartId:     string,
  lineItemId: string,
  payload:    { quantity: number }
): Promise<Cart> {
  return apiFetch(`/cart/${cartId}/items/${lineItemId}`, {
    method: 'PATCH',
    body:   payload,
  })
}

export async function removeCartItem(
  cartId:     string,
  lineItemId: string
): Promise<Cart> {
  return apiFetch(`/cart/${cartId}/items/${lineItemId}`, {
    method: 'DELETE',
  })
}

export async function getCheckoutUrl(cartId: string): Promise<{ url: string }> {
  return apiFetch(`/cart/${cartId}/checkout`, { method: 'POST' })
}
