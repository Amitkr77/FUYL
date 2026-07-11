import { apiFetch } from './client'

// ─── Addresses ─────────────────────────────────────────────────────────────
// Mirrors fuyl-backend's ICustomerAddress exactly (label/postalCode, not the
// firstName/lastName/pincode shape types/user.ts's old Address type assumed
// — that type was never wired to anything real).
export interface Address {
  id: string
  label: string
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
  country: string
  phone?: string
  isDefault: boolean
  isBilling: boolean
  isShipping: boolean
  deliveryInstructions?: string
}

interface BackendAddress {
  _id: string
  label: string
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
  country: string
  phone?: string
  isDefault: boolean
  isBilling: boolean
  isShipping: boolean
  deliveryInstructions?: string
}

function mapAddress(a: BackendAddress): Address {
  return {
    id: a._id, label: a.label, line1: a.line1, line2: a.line2, city: a.city, state: a.state,
    postalCode: a.postalCode, country: a.country, phone: a.phone,
    isDefault: a.isDefault, isBilling: a.isBilling, isShipping: a.isShipping,
    deliveryInstructions: a.deliveryInstructions,
  }
}

export type AddressInput = Omit<Address, 'id'>

// The mutation endpoints (add/update/remove) return the customer's whole
// profile document, not a bare addresses array — the GET endpoint is the
// only one that returns addresses directly. Unwrap consistently here so
// every caller gets back the same `Address[]` shape either way.
interface BackendProfile {
  addresses: BackendAddress[]
}

export async function getAddresses(token: string): Promise<Address[]> {
  const raw = await apiFetch<BackendAddress[]>('/customer/addresses', { token })
  return raw.map(mapAddress)
}

export async function addAddress(token: string, input: AddressInput): Promise<Address[]> {
  const profile = await apiFetch<BackendProfile>('/customer/addresses', { method: 'POST', body: input, token })
  return profile.addresses.map(mapAddress)
}

export async function updateAddress(token: string, id: string, input: Partial<AddressInput>): Promise<Address[]> {
  const profile = await apiFetch<BackendProfile>(`/customer/addresses/${id}`, { method: 'PATCH', body: input, token })
  return profile.addresses.map(mapAddress)
}

export async function removeAddress(token: string, id: string): Promise<void> {
  await apiFetch(`/customer/addresses/${id}`, { method: 'DELETE', token })
}

// ─── Wishlist ───────────────────────────────────────────────────────────────
interface BackendWishlistItem {
  productId: string
  variantId?: string
  addedAt: string
}

export interface WishlistItem {
  productId: string
  variantId?: string
  addedAt: string
}

export async function getWishlist(token: string): Promise<WishlistItem[]> {
  const raw = await apiFetch<BackendWishlistItem[]>('/customer/wishlist', { token })
  return raw
}

export async function addToWishlist(token: string, productId: string, variantId?: string): Promise<void> {
  await apiFetch('/customer/wishlist', { method: 'POST', body: { productId, variantId }, token })
}

export async function removeFromWishlist(token: string, productId: string, variantId?: string): Promise<void> {
  const qs = variantId ? `?variantId=${variantId}` : ''
  await apiFetch(`/customer/wishlist/${productId}${qs}`, { method: 'DELETE', token })
}

// ─── Loyalty ────────────────────────────────────────────────────────────────
export interface LoyaltySummary {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  points: number
  lifetimeSpend: number
  lifetimeOrders: number
  nextTierThreshold: { tier: string; threshold: number; progress: number } | null
}

export async function getLoyalty(token: string): Promise<LoyaltySummary> {
  return apiFetch<LoyaltySummary>('/customer/loyalty', { token })
}
