import { apiFetch } from './client'

export interface PincodeServiceability {
  serviceable: boolean
  prepaid: boolean
  cod: boolean
  etdDays: number | null
}

// Public — GET /shipping/serviceability/:pincode (see fuyl-backend
// shipping.controller.ts). Falls back to serviceable:true when no carrier is
// configured yet (dev), matching the backend's own fallback.
export async function checkPincodeServiceability(pincode: string): Promise<PincodeServiceability> {
  return apiFetch<PincodeServiceability>(`/shipping/serviceability/${pincode}`, {
    cache: 'no-store',
  })
}
