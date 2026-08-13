import { adminApiFetch } from './api'

export type DiscountValueType = 'percent' | 'flat' | 'per_unit' | 'free_shipping' | 'buy_x_get_y'
export type DiscountStatus = 'draft' | 'active' | 'paused' | 'ended'
export type DiscountMethod = 'coupon' | 'automatic' | 'bundle' | 'flash_sale'

export interface DiscountCode {
  code: string
  discountType: DiscountValueType
  discountValue: number
  scope: 'cart' | 'category' | 'product' | 'variant'
  targetIds?: string[]
  maxRedemptionsPerUser: number
  maxRedemptionsGlobal?: number
  minOrderSubtotal?: number
  maxDiscountAmount?: number
  isFirstOrderOnly?: boolean
  buyQuantity?: number
  getQuantity?: number
  buyTargetIds?: string[]
  getTargetIds?: string[]
  redemptionsCount: number
  isActive: boolean
}

export interface Discount {
  id: string
  name: string
  description: string
  status: DiscountStatus
  type: DiscountMethod
  startsAt: string
  endsAt?: string
  coupons: DiscountCode[]
  isFeatured: boolean
  isActive: boolean
  createdAt: string
}

interface BackendDiscount extends Omit<Discount, 'id' | 'description'> { _id: string; description?: string }
const mapDiscount = (discount: BackendDiscount): Discount => ({ ...discount, id: discount._id, description: discount.description ?? '', coupons: discount.coupons ?? [] })

export interface CreateDiscountInput {
  name: string
  description?: string
  type: DiscountMethod
  status?: DiscountStatus
  startsAt: string
  endsAt?: string
  coupons: Array<Omit<DiscountCode, 'redemptionsCount' | 'isActive'> & { startsAt: string; endsAt?: string }>
}

export async function listDiscounts(): Promise<Discount[]> {
  const raw = await adminApiFetch<BackendDiscount[]>('/admin/discounts?limit=100')
  return raw.map(mapDiscount)
}
export async function getDiscount(id: string): Promise<Discount | null> { try { return mapDiscount(await adminApiFetch<BackendDiscount>(`/admin/discounts/${id}`)) } catch { return null } }
export async function createDiscount(input: CreateDiscountInput): Promise<void> { await adminApiFetch('/admin/discounts', { method: 'POST', body: input }) }
export type UpdateDiscountInput = Partial<CreateDiscountInput> & { status?: DiscountStatus; isFeatured?: boolean; isActive?: boolean }
export async function updateDiscount(id: string, patch: UpdateDiscountInput): Promise<void> { await adminApiFetch(`/admin/discounts/${id}`, { method: 'PATCH', body: patch }) }
export async function deleteDiscount(id: string): Promise<void> { await adminApiFetch(`/admin/discounts/${id}`, { method: 'DELETE' }) }
