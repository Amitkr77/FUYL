import { apiFetch } from './client'

export interface PincodeServiceability {
  serviceable: boolean
  prepaid: boolean
  cod: boolean
  etdDays: number | null
}

export interface PincodeServiceabilityProduct extends PincodeServiceability {
  warehouseCity: string | null
}

// Public — GET /shipping/serviceability/:pincode (see fuyl-backend
// shipping.controller.ts). Falls back to serviceable:true when no carrier is
// configured yet (dev), matching the backend's own fallback.
export async function checkPincodeServiceability(pincode: string): Promise<PincodeServiceability> {
  return apiFetch<PincodeServiceability>(`/shipping/serviceability/${pincode}`, {
    cache: 'no-store',
  })
}

// Inventory-aware variant — uses the nearest warehouse that has stock for the
// given product/variant as the Shiprocket pickup origin.
export async function checkPincodeServiceabilityForProduct(
  pincode: string,
  productId: string,
  variantId?: string,
  weightGrams?: number,
): Promise<PincodeServiceabilityProduct> {
  const params = new URLSearchParams({ productId })
  if (variantId)    params.set('variantId', variantId)
  if (weightGrams)  params.set('weight', String(weightGrams))
  return apiFetch<PincodeServiceabilityProduct>(
    `/shipping/serviceability/${pincode}/product?${params.toString()}`,
    { cache: 'no-store' },
  )
}
