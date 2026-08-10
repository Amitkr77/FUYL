import { adminApiFetch } from './api'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AffiliateStatus = 'pending' | 'approved' | 'rejected' | 'suspended'
export type CommissionStatus = 'pending' | 'approved' | 'payable' | 'paid' | 'cancelled' | 'reversed'

export interface Affiliate {
  id: string
  name: string
  email: string
  phone?: string
  channels: string[]
  status: AffiliateStatus
  programId: string
  userId?: string
  paymentInfo?: {
    upi?: string
    bankAccount?: string
    ifsc?: string
    accountName?: string
  }
  stats: {
    totalClicks: number
    totalOrders: number
    totalRevenue: number
    totalCommissionEarned: number
    totalCommissionPaid: number
  }
  approvedAt?: string
  rejectedAt?: string
  suspendedAt?: string
  createdAt: string
}

export interface Commission {
  id: string
  affiliateId: string | { name: string; email: string }
  orderId: string
  snapshotRate: number
  baseAmount: number
  amount: number
  status: CommissionStatus
  eligibleForApprovalAt?: string
  approvedAt?: string
  paidAt?: string
  createdAt: string
}

// commissions is a sparse map: status → { count, total (sum of amounts) }
export type CommissionStatsByStatus = Partial<Record<CommissionStatus, { count: number; total: number }>>

export interface AffiliateStats {
  affiliates: {
    total: number
    pending: number
    approved: number
    suspended: number
  }
  commissions: CommissionStatsByStatus
}

interface BackendAffiliate {
  _id: string
  name: string
  email: string
  phone?: string
  channels: string[]
  status: AffiliateStatus
  programId: string
  userId?: string
  paymentInfo?: Affiliate['paymentInfo']
  stats: Affiliate['stats']
  approvedAt?: string
  rejectedAt?: string
  suspendedAt?: string
  createdAt: string
}

interface BackendCommission {
  _id: string
  affiliateId: string | { name: string; email: string }
  orderId: string
  snapshotRate: number
  baseAmount: number
  amount: number
  status: CommissionStatus
  eligibleForApprovalAt?: string
  approvedAt?: string
  paidAt?: string
  createdAt: string
}

function mapAffiliate(a: BackendAffiliate): Affiliate {
  return { ...a, id: a._id }
}

function mapCommission(c: BackendCommission): Commission {
  return { ...c, id: c._id }
}

// ─── Affiliates ───────────────────────────────────────────────────────────────

export async function listAffiliates(params?: {
  status?: AffiliateStatus
  page?: number
  limit?: number
}): Promise<{ items: Affiliate[]; total: number }> {
  const qs = new URLSearchParams()
  if (params?.status) qs.set('status', params.status)
  if (params?.page)   qs.set('page',   String(params.page))
  if (params?.limit)  qs.set('limit',  String(params.limit))
  const raw = await adminApiFetch<{ items: BackendAffiliate[]; total: number }>(
    `/admin/affiliates?${qs.toString()}`
  )
  return { items: raw.items.map(mapAffiliate), total: raw.total }
}

export async function getAffiliateStats(): Promise<AffiliateStats> {
  return adminApiFetch<AffiliateStats>('/admin/affiliates/stats')
}

export async function approveAffiliate(id: string): Promise<Affiliate> {
  const raw = await adminApiFetch<{ affiliate: BackendAffiliate }>(`/admin/affiliates/${id}/approve`, {
    method: 'POST',
  })
  return mapAffiliate(raw.affiliate)
}

export async function rejectAffiliate(id: string, reason: string): Promise<void> {
  await adminApiFetch(`/admin/affiliates/${id}/reject`, {
    method: 'POST',
    body: { reason },
  })
}

export async function suspendAffiliate(id: string, reason: string): Promise<void> {
  await adminApiFetch(`/admin/affiliates/${id}/suspend`, {
    method: 'POST',
    body: { reason },
  })
}

export async function payoutAffiliate(id: string): Promise<{ totalPaid: number; commissionIds: string[] }> {
  return adminApiFetch(`/admin/affiliates/${id}/payout`, { method: 'POST' })
}

// ─── Commissions ──────────────────────────────────────────────────────────────

export async function listCommissions(params?: {
  status?: CommissionStatus
  page?: number
  limit?: number
}): Promise<{ items: Commission[]; total: number }> {
  const qs = new URLSearchParams()
  if (params?.status) qs.set('status', params.status)
  if (params?.page)   qs.set('page',   String(params.page))
  if (params?.limit)  qs.set('limit',  String(params.limit))
  const raw = await adminApiFetch<{ items: BackendCommission[]; total: number }>(
    `/admin/commissions?${qs.toString()}`
  )
  return { items: raw.items.map(mapCommission), total: raw.total }
}

export async function approveCommission(id: string): Promise<void> {
  await adminApiFetch(`/admin/commissions/${id}/approve`, { method: 'POST' })
}
