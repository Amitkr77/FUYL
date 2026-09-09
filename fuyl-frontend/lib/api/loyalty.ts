import { apiFetch } from './client'

export interface LoyaltyBalance {
  balance: number
  lifetimeEarned: number
  lifetimeRedeemed: number
  redeemableValue: number   // balance converted to ₹
  canRedeem: boolean
  minRedeemPoints: number
}

export interface LoyaltyRedemptionPreview {
  availablePoints: number
  pointsToRedeem: number
  monetaryValue: number
  canRedeem: boolean
  reason?: string
}

export interface LoyaltyTransaction {
  id: string
  type: 'earn' | 'redeem' | 'reverse' | 'expire' | 'adjust'
  points: number
  balanceBefore: number
  balanceAfter: number
  description: string
  createdAt: string
}

interface BackendLoyaltyTransaction extends Omit<LoyaltyTransaction, 'id'> {
  _id: string
}

export async function getLoyaltyBalance(token: string): Promise<LoyaltyBalance> {
  return apiFetch<LoyaltyBalance>('/loyalty/me', { token })
}

export async function getLoyaltyTransactions(token: string, page = 1, limit = 20): Promise<{ items: LoyaltyTransaction[]; total: number }> {
  // Paginated backend responses put the records directly in `data` and
  // pagination details in `meta`. apiFetch unwraps `data`, so `raw` is the
  // array itself (not an object containing an `items` property).
  const response = await apiFetch<{ data: BackendLoyaltyTransaction[]; meta?: { total?: number } }>(
    `/loyalty/me/transactions?page=${page}&limit=${limit}`,
    { token, unwrap: false },
  )
  const records = Array.isArray(response.data) ? response.data : []
  return {
    total: response.meta?.total ?? records.length,
    items: records.map((t) => ({
      id:            t._id,
      type:          t.type,
      points:        t.points,
      balanceBefore: t.balanceBefore,
      balanceAfter:  t.balanceAfter,
      description:   t.description,
      createdAt:     t.createdAt,
    })),
  }
}

export async function previewLoyaltyRedemption(token: string, orderTotal: number): Promise<LoyaltyRedemptionPreview> {
  return apiFetch<LoyaltyRedemptionPreview>(`/loyalty/me/preview-redemption?orderTotal=${orderTotal}`, { token })
}
