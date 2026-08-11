import { adminApiFetch } from './api'

export type CashbackType     = 'percentage' | 'flat'
export type CashbackMode     = 'standalone' | 'attached'
export type CreditTiming     = 'on_order' | 'on_delivery' | 'after_days'
export type CashbackScope    = 'all' | 'specific_products' | 'specific_categories'
export type EarningStatus    = 'pending' | 'credited' | 'reversed' | 'expired'

export interface AllowedUser {
  id: string
  email: string
  name: string
}

export interface CashbackPolicy {
  id: string
  name: string
  description?: string
  mode: CashbackMode
  couponCode?: string
  type: CashbackType
  value: number
  maxCap?: number
  minOrderAmount?: number
  scope: CashbackScope
  creditTiming: CreditTiming
  creditAfterDays?: number
  expiryDays: number
  isActive: boolean
  startDate?: string
  endDate?: string
  maxUsesPerUser: number
  totalBudget: number
  usedBudget: number
  allowedUserIds?: string[]
  allowedUsers?: AllowedUser[]
  createdAt: string
}

export interface CashbackEarning {
  id: string
  orderId: string
  userId: string
  policyId?: string | { name: string }
  cashbackBase: number
  cashbackAmount: number
  status: EarningStatus
  creditTiming: string
  scheduledCreditAt: string
  creditedAt?: string
  couponCode?: string
  createdAt: string
}

interface BackendPolicy {
  _id: string
  name: string
  description?: string
  mode: CashbackMode
  couponCode?: string
  type: CashbackType
  value: number
  maxCap?: number
  minOrderAmount?: number
  scope: CashbackScope
  creditTiming: CreditTiming
  creditAfterDays?: number
  expiryDays: number
  isActive: boolean
  startDate?: string
  endDate?: string
  maxUsesPerUser: number
  totalBudget: number
  usedBudget: number
  createdAt: string
}

interface BackendEarning {
  _id: string
  orderId: string
  userId: string
  policyId?: string | { name: string }
  cashbackBase: number
  cashbackAmount: number
  status: EarningStatus
  creditTiming: string
  scheduledCreditAt: string
  creditedAt?: string
  couponCode?: string
  createdAt: string
}

function mapPolicy(p: BackendPolicy): CashbackPolicy {
  return { ...p, id: p._id }
}

function mapEarning(e: BackendEarning): CashbackEarning {
  return { ...e, id: e._id }
}

// ─── Policies ─────────────────────────────────────────────────────────────────

export async function listCashbackPolicies(): Promise<CashbackPolicy[]> {
  const raw = await adminApiFetch<BackendPolicy[]>('/admin/cashback/policies?limit=100')
  return raw.map(mapPolicy)
}

export async function getCashbackPolicy(id: string): Promise<CashbackPolicy | null> {
  try {
    return mapPolicy(await adminApiFetch<BackendPolicy>(`/admin/cashback/policies/${id}`))
  } catch {
    return null
  }
}

export interface CreatePolicyInput {
  name: string
  description?: string
  mode: CashbackMode
  couponCode?: string
  type: CashbackType
  value: number
  maxCap?: number
  minOrderAmount?: number
  scope?: CashbackScope
  creditTiming?: CreditTiming
  creditAfterDays?: number
  expiryDays?: number
  isActive?: boolean
  startDate?: string
  endDate?: string
  maxUsesPerUser?: number
  totalBudget?: number
  allowedUserIds?: string[]
}

export async function createCashbackPolicy(input: CreatePolicyInput): Promise<CashbackPolicy> {
  return mapPolicy(await adminApiFetch<BackendPolicy>('/admin/cashback/policies', { method: 'POST', body: input }))
}

export async function updateCashbackPolicy(id: string, patch: Partial<CreatePolicyInput>): Promise<CashbackPolicy> {
  return mapPolicy(await adminApiFetch<BackendPolicy>(`/admin/cashback/policies/${id}`, { method: 'PATCH', body: patch }))
}

export async function deleteCashbackPolicy(id: string): Promise<void> {
  await adminApiFetch(`/admin/cashback/policies/${id}`, { method: 'DELETE' })
}

// ─── Earnings ─────────────────────────────────────────────────────────────────

export async function listCashbackEarnings(params?: {
  status?: EarningStatus
  userId?: string
  page?: number
  limit?: number
}): Promise<{ items: CashbackEarning[]; total: number }> {
  const qs = new URLSearchParams()
  if (params?.status) qs.set('status', params.status)
  if (params?.userId) qs.set('userId', params.userId)
  if (params?.page)   qs.set('page',   String(params.page))
  // Fetch a larger slice so the summary card total is accurate enough
  qs.set('limit', String(params?.limit ?? 50))
  const items = await adminApiFetch<BackendEarning[]>(`/admin/cashback/earnings?${qs.toString()}`)
  return { items: items.map(mapEarning), total: items.length }
}
