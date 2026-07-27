// Looks up city/state for an Indian PIN code via India Post's free public API
// (no key required) — lets checkout auto-fill City/State the moment a valid
// 6-digit pincode is entered, instead of making the shopper type both.
export interface PincodeResult {
  city: string
  state: string
}

interface PostOffice {
  Name: string
  District: string
  State: string
}
interface PincodeApiResponse {
  Status: string
  PostOffice: PostOffice[] | null
}

export async function lookupPincode(pincode: string): Promise<PincodeResult | null> {
  if (!/^\d{6}$/.test(pincode)) return null
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`)
    if (!res.ok) return null
    const data: PincodeApiResponse[] = await res.json()
    const office = data[0]?.PostOffice?.[0]
    if (data[0]?.Status !== 'Success' || !office) return null
    return { city: office.District, state: office.State }
  } catch {
    // Offline, API hiccup, CORS, etc. — fail silently, the shopper can just
    // type city/state manually, exactly as before this feature existed.
    return null
  }
}
