import { adminApiFetch, AdminApiError } from './api'

export type DiscountType = 'percent' | 'flat' | 'per_unit' | 'free_shipping'
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'ended'
export type CampaignType = 'coupon' | 'automatic' | 'bundle' | 'flash_sale'

export interface Coupon {
  code: string
  discountType: DiscountType
  discountValue: number
  scope: 'cart' | 'category' | 'product' | 'variant' | 'seller'
  maxRedemptionsPerUser: number
  redemptionsCount: number
  isActive: boolean
}

interface BackendCampaign {
  _id: string
  name: string
  description?: string
  status: CampaignStatus
  type: CampaignType
  startsAt: string
  endsAt?: string
  coupons: Coupon[]
  isFeatured: boolean
  isActive: boolean
  createdAt: string
}

export interface Campaign {
  id: string
  name: string
  description: string
  status: CampaignStatus
  type: CampaignType
  startsAt: string
  endsAt?: string
  coupons: Coupon[]
  isFeatured: boolean
  isActive: boolean
  createdAt: string
}

function mapCampaign(c: BackendCampaign): Campaign {
  return {
    id: c._id, name: c.name, description: c.description ?? '', status: c.status, type: c.type,
    startsAt: c.startsAt, endsAt: c.endsAt, coupons: c.coupons ?? [],
    isFeatured: c.isFeatured, isActive: c.isActive, createdAt: c.createdAt,
  }
}

export async function listCampaigns(): Promise<Campaign[]> {
  const raw = await adminApiFetch<BackendCampaign[]>('/admin/promotions/campaigns?limit=100')
  return raw.map(mapCampaign)
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  try {
    return mapCampaign(await adminApiFetch<BackendCampaign>(`/admin/promotions/campaigns/${id}`))
  } catch {
    return null
  }
}

export interface CreateCampaignInput {
  name: string
  description?: string
  type: CampaignType
  startsAt: string
  endsAt?: string
  coupons: Array<{
    code: string
    discountType: DiscountType
    discountValue: number
    scope: Coupon['scope']
    startsAt: string
    endsAt?: string
    maxRedemptionsPerUser: number
  }>
}

export async function createCampaign(input: CreateCampaignInput): Promise<void> {
  await adminApiFetch('/admin/promotions/campaigns', { method: 'POST', body: input })
}

export async function updateCampaignStatus(id: string, patch: {
  status?: CampaignStatus
  isFeatured?: boolean
  isActive?: boolean
}): Promise<void> {
  await adminApiFetch(`/admin/promotions/campaigns/${id}`, { method: 'PATCH', body: patch })
}

export async function deleteCampaign(id: string): Promise<void> {
  await adminApiFetch(`/admin/promotions/campaigns/${id}`, { method: 'DELETE' })
}

export { AdminApiError }
