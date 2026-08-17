import { apiFetch } from './client'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AffiliateStatus   = 'pending' | 'approved' | 'rejected' | 'suspended'
export type CommissionStatus  = 'pending' | 'approved' | 'payable' | 'paid' | 'cancelled' | 'reversed'
export type PayoutStatus      = 'pending' | 'processing' | 'paid' | 'failed'
export type PerformanceTab    = 'referrals' | 'commission' | 'sales' | 'clicks'

export interface AffiliateStats {
  totalClicks:           number
  totalOrders:           number
  totalRevenue:          number
  totalCommissionEarned: number
  totalCommissionPaid:   number
}

export interface AffiliateLink {
  _id:         string
  code:        string
  destination: string
  label?:      string
  isActive:    boolean
  trackingUrl: string
}

export interface Commission {
  _id:                    string
  orderId:                string | { _id: string; orderNumber?: string }
  attributionId?:         string
  snapshotRate:           number
  baseAmount:             number
  amount:                 number
  status:                 CommissionStatus
  eligibleForApprovalAt?: string
  approvedAt?:            string
  payableAt?:             string
  paidAt?:                string
  cancelledAt?:           string
  reversedAt?:            string
  createdAt:              string
}

export interface AffiliatePayout {
  _id:            string
  amount:         number
  status:         PayoutStatus
  paymentMethod:  'upi' | 'bank_transfer' | 'wallet_credit'
  paidAt?:        string
  failedAt?:      string
  failureReason?: string
  createdAt:      string
}

export interface AffiliateProfile {
  _id:          string
  name:         string
  email:        string
  phone?:       string
  channels:     string[]
  status:       AffiliateStatus
  paymentInfo?: {
    upi?:         string
    bankAccount?: string
    ifsc?:        string
    accountName?: string
  }
  stats:    AffiliateStats
  metadata?: {
    website?:       string
    socialHandles?: Record<string, string>
  }
  approvedAt?:       string
  rejectedAt?:       string
  rejectedReason?:   string
  suspendedAt?:      string
  suspendedReason?:  string
  createdAt:         string
}

export interface AffiliateProgram {
  name:                  string
  description?:          string
  defaultRate:           number
  commissionBase:        'subtotal' | 'grand_total'
  attributionWindowDays: number
  minPayoutAmount:       number
}

export interface PerformanceDataPoint {
  date:  string   // "YYYY-MM-DD"
  value: number
}

export interface AffiliateDashboard {
  affiliate:   AffiliateProfile
  links:       AffiliateLink[]
  commissions: Commission[]
  payouts:     AffiliatePayout[]
  stats:       AffiliateStats
}

// ─── API calls ────────────────────────────────────────────────────────────────

// Public — no token required
export async function applyAffiliate(input: {
  name:      string
  email:     string
  phone?:    string
  channels:  string[]
  message?:  string
}, token?: string): Promise<{ _id: string; status: AffiliateStatus }> {
  return apiFetch('/affiliate/apply', { method: 'POST', body: input, token })
}

export interface PublicAffiliateSettings {registrationEnabled:boolean;signupTitle:string;signupIntroduction:string;termsUrl?:string;requiredFields:string[];defaultProgram?:{name:string;defaultRate:number}}
export async function getPublicAffiliateSettings():Promise<PublicAffiliateSettings>{return(await apiFetch<{settings:PublicAffiliateSettings}>('/affiliate/settings')).settings}

// Affiliate profile (lightweight — for auth guard)
export async function getAffiliateMe(token: string): Promise<AffiliateProfile> {
  return apiFetch('/affiliate/me', { token })
}

// Full dashboard (affiliate + links + commissions + payouts + stats)
export async function getAffiliateDashboard(token: string): Promise<AffiliateDashboard> {
  return apiFetch('/affiliate/dashboard', { token })
}

// Active program public details
export async function getAffiliateProgram(token: string): Promise<AffiliateProgram> {
  return apiFetch('/affiliate/program', { token })
}

// Tracking links
export async function getAffiliateLinks(token: string): Promise<AffiliateLink[]> {
  return apiFetch('/affiliate/links', { token })
}

export async function createAffiliateLink(
  token: string,
  input: { destination: string; label?: string }
): Promise<AffiliateLink> {
  return apiFetch('/affiliate/links', { method: 'POST', body: input, token })
}

// Commissions — all filters optional
export async function getAffiliateCommissions(
  token: string,
  filters?: {
    status?:        CommissionStatus
    createdAtFrom?: string   // ISO date string e.g. "2026-07-01"
    createdAtTo?:   string
  }
): Promise<Commission[]> {
  const params = new URLSearchParams()
  if (filters?.status)        params.set('status',        filters.status)
  if (filters?.createdAtFrom) params.set('createdAtFrom', filters.createdAtFrom)
  if (filters?.createdAtTo)   params.set('createdAtTo',   filters.createdAtTo)
  const qs = params.toString() ? `?${params.toString()}` : ''
  return apiFetch(`/affiliate/commissions${qs}`, { token })
}

// Payouts
export async function getAffiliatePayouts(token: string): Promise<AffiliatePayout[]> {
  return apiFetch('/affiliate/payouts', { token })
}

// Performance time-series
export async function getAffiliatePerformance(
  token: string,
  params: { from: string; to: string; tab: PerformanceTab }
): Promise<PerformanceDataPoint[]> {
  const qs = new URLSearchParams({
    from: params.from,
    to:   params.to,
    tab:  params.tab,
  })
  return apiFetch(`/affiliate/performance?${qs}`, { token })
}

// Payment info
export async function updateAffiliatePaymentInfo(
  token: string,
  info: { upi?: string; bankAccount?: string; ifsc?: string; accountName?: string }
): Promise<void> {
  await apiFetch('/affiliate/payment-info', { method: 'PATCH', body: info, token })
}

// Profile (name, phone, channels, website, socialHandles)
export async function updateAffiliateProfile(
  token: string,
  patch: {
    name?:          string
    phone?:         string
    channels?:      string[]
    website?:       string
    socialHandles?: Record<string, string>
  }
): Promise<AffiliateProfile> {
  return apiFetch('/affiliate/profile', { method: 'PATCH', body: patch, token })
}

export async function exchangeAffiliateImpersonation(code:string):Promise<{accessToken:string;affiliate:AffiliateProfile;user:{_id:string;email:string;firstName?:string;lastName?:string;phone?:string};expiresInSeconds:number}>{return apiFetch('/affiliate/impersonation/exchange',{method:'POST',body:{code}})}
