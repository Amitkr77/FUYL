import { adminApiFetch } from './api'

export type EligibleBase =
  | 'original_subtotal'
  | 'discounted_subtotal'
  | 'order_total'
  | 'order_total_excl_shipping'
  | 'amount_paid'

export type LoyaltyTxType = 'earn' | 'redeem' | 'reverse' | 'expire' | 'adjust'

export interface LoyaltyConfig {
  id: string
  earnSpend: number
  earnPoints: number
  redeemPoints: number
  redeemValue: number
  minRedeemPoints: number
  maxRedeemPointsPerOrder: number
  maxRedeemPercent: number
  allowPartialRedemption: boolean
  eligibleBase: EligibleBase
  includeShipping: boolean
  includeTax: boolean
  includeWalletPaid: boolean
  pointExpiryDays: number
  reverseOnCancel: boolean
  reverseOnRefund: boolean
  isActive: boolean
  createdAt: string
}

export interface LoyaltyTransaction {
  id: string
  type: LoyaltyTxType
  points: number
  balanceBefore: number
  balanceAfter: number
  description: string
  referenceType?: string
  createdAt: string
}

export interface LoyaltyAccount {
  balance: number
  lifetimeEarned: number
  lifetimeRedeemed: number
}

interface BackendConfig {
  _id: string
  earnSpend: number
  earnPoints: number
  redeemPoints: number
  redeemValue: number
  minRedeemPoints: number
  maxRedeemPointsPerOrder: number
  maxRedeemPercent: number
  allowPartialRedemption: boolean
  eligibleBase: EligibleBase
  includeShipping: boolean
  includeTax: boolean
  includeWalletPaid: boolean
  pointExpiryDays: number
  reverseOnCancel: boolean
  reverseOnRefund: boolean
  isActive: boolean
  createdAt: string
}

interface BackendTx {
  _id: string
  type: LoyaltyTxType
  points: number
  balanceBefore: number
  balanceAfter: number
  description: string
  referenceType?: string
  createdAt: string
}

function mapConfig(c: BackendConfig): LoyaltyConfig {
  return { ...c, id: c._id }
}

function mapTx(t: BackendTx): LoyaltyTransaction {
  return { ...t, id: t._id }
}

export async function getActiveLoyaltyConfig(): Promise<LoyaltyConfig | null> {
  const raw = await adminApiFetch<BackendConfig | null>('/admin/loyalty/config')
  return raw ? mapConfig(raw) : null
}

export async function getLoyaltyAccount(userId: string): Promise<LoyaltyAccount> {
  return adminApiFetch<LoyaltyAccount>(`/admin/loyalty/accounts/${userId}`)
}

export interface LoyaltyConfigInput {
  earnSpend?: number
  earnPoints?: number
  redeemPoints?: number
  redeemValue?: number
  minRedeemPoints?: number
  maxRedeemPointsPerOrder?: number
  maxRedeemPercent?: number
  allowPartialRedemption?: boolean
  eligibleBase?: EligibleBase
  includeShipping?: boolean
  includeTax?: boolean
  includeWalletPaid?: boolean
  pointExpiryDays?: number
  reverseOnCancel?: boolean
  reverseOnRefund?: boolean
  isActive?: boolean
}

export async function createLoyaltyConfig(input: LoyaltyConfigInput): Promise<LoyaltyConfig> {
  return mapConfig(await adminApiFetch<BackendConfig>('/admin/loyalty/config', { method: 'POST', body: input }))
}

export async function updateLoyaltyConfig(id: string, patch: LoyaltyConfigInput): Promise<LoyaltyConfig> {
  return mapConfig(await adminApiFetch<BackendConfig>(`/admin/loyalty/config/${id}`, { method: 'PATCH', body: patch }))
}

export async function getLoyaltyTransactions(
  userId: string,
  page = 1,
  limit = 30,
): Promise<{ items: LoyaltyTransaction[]; total: number }> {
  const qs = new URLSearchParams({ userId, page: String(page), limit: String(limit) })
  const raw = await adminApiFetch<BackendTx[]>(
    `/admin/loyalty/transactions?${qs.toString()}`
  )
  const records = Array.isArray(raw) ? raw : []
  return { items: records.map(mapTx), total: records.length }
}

export async function adminAdjustLoyalty(input: {
  userId: string
  points: number
  description: string
}): Promise<void> {
  await adminApiFetch('/admin/loyalty/adjust', { method: 'POST', body: input })
}
