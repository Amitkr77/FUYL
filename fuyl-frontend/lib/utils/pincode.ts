// Looks up city/state for an Indian PIN code via India Post's free public API
// (no key required) — lets checkout auto-fill City/State the moment a valid
// 6-digit pincode is entered, instead of making the shopper type both.
export interface PincodeResult {
  city: string
  state: string
  locality: string
  localities: string[]
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
  if (!/^[1-9]\d{5}$/.test(pincode)) return null
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`)
    if (!res.ok) return null
    const data: PincodeApiResponse[] = await res.json()
    const offices = data[0]?.PostOffice
    const office = offices?.[0]
    if (data[0]?.Status !== 'Success' || !office) return null
    return {
      city: office.District,
      state: office.State,
      locality: office.Name,
      localities: [...new Set((offices ?? []).map((item) => item.Name).filter(Boolean))],
    }
  } catch {
    // Offline, API hiccup, CORS, etc. — fail silently, the shopper can just
    // type city/state manually, exactly as before this feature existed.
    return null
  }
}
