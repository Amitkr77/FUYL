import { adminApiFetch, AdminApiError } from './api'

export interface ReferralStats {
  total: number
  shared: number
  inProgress: number
  rewarded: number
  rejected: number
  conversionRate: number
  totalRewardsPaid: number
}

export async function getReferralStats(): Promise<ReferralStats> {
  return adminApiFetch<ReferralStats>('/admin/referrals/stats')
}

export type ReferralStatus = 'shared' | 'applied' | 'pending' | 'eligible' | 'rewarded' | 'completed' | 'rejected'

interface BackendReferral {
  _id: string
  referrerId: string
  refereeId: string
  code: string
  status: ReferralStatus
  sharedAt: string
  rewardedAt?: string
  rejectedReason?: string
  createdAt: string
}

export interface Referral {
  id: string
  referrerId: string
  refereeId: string
  code: string
  status: ReferralStatus
  sharedAt: string
  rewardedAt?: string
  rejectedReason?: string
  createdAt: string
}

export async function listReferrals(): Promise<Referral[]> {
  const raw = await adminApiFetch<BackendReferral[]>('/admin/referrals?limit=100')
  return raw.map((r) => ({
    id: r._id, referrerId: r.referrerId, refereeId: r.refereeId, code: r.code,
    status: r.status, sharedAt: r.sharedAt, rewardedAt: r.rewardedAt,
    rejectedReason: r.rejectedReason, createdAt: r.createdAt,
  }))
}

export { AdminApiError }
