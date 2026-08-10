import { apiFetch } from './client'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AffiliateStatus = 'pending' | 'approved' | 'rejected' | 'suspended'
export type CommissionStatus = 'pending' | 'approved' | 'payable' | 'paid' | 'cancelled' | 'reversed'

export interface AffiliateStats {
  totalClicks: number
  totalOrders: number
  totalRevenue: number
  totalCommissionEarned: number
  totalCommissionPaid: number
}

export interface AffiliateLink {
  _id: string
  code: string
  destination: string
  label?: string
  isActive: boolean
  trackingUrl: string
}

export interface Commission {
  _id: string
  orderId: string
  snapshotRate: number
  baseAmount: number
  amount: number
  status: CommissionStatus
  eligibleForApprovalAt?: string
  paidAt?: string
  createdAt: string
}

export interface AffiliateDashboard {
  affiliate: {
    _id: string
    name: string
    email: string
    status: AffiliateStatus
    stats: AffiliateStats
  }
  links: AffiliateLink[]
  commissions: Commission[]
  stats: AffiliateStats
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function applyAffiliate(input: {
  name: string
  email: string
  phone?: string
  channels: string[]
  message?: string
}): Promise<{ _id: string; status: AffiliateStatus }> {
  return apiFetch('/affiliate/apply', { method: 'POST', body: input })
}

export async function getAffiliateDashboard(token: string): Promise<AffiliateDashboard> {
  return apiFetch('/affiliate/dashboard', { token })
}

export async function getAffiliateLinks(token: string): Promise<AffiliateLink[]> {
  return apiFetch('/affiliate/links', { token })
}

export async function createAffiliateLink(
  token: string,
  input: { destination: string; label?: string }
): Promise<AffiliateLink> {
  return apiFetch('/affiliate/links', { method: 'POST', body: input, token })
}

export async function getAffiliateCommissions(
  token: string,
  status?: CommissionStatus
): Promise<Commission[]> {
  const qs = status ? `?status=${status}` : ''
  return apiFetch(`/affiliate/commissions${qs}`, { token })
}

export async function updateAffiliatePaymentInfo(
  token: string,
  info: { upi?: string; bankAccount?: string; ifsc?: string; accountName?: string }
): Promise<void> {
  await apiFetch('/affiliate/payment-info', { method: 'PATCH', body: info, token })
}
