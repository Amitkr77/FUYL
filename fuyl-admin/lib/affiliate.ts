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
  programId: string | { _id: string; name: string; defaultRate: number; commissionBase?: string }
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
  metadata?: { internalNote?: string; fraudReview?: { status?: 'clear'|'review'|'blocked'; note?: string; reviewedAt?: string } }
}

export interface Commission {
  id: string
  affiliateId: string | { name: string; email: string }
  orderId: string | { _id: string; orderNumber?: string; grandTotal?: number }
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
  programId: Affiliate['programId']
  userId?: string
  paymentInfo?: Affiliate['paymentInfo']
  stats: Affiliate['stats']
  approvedAt?: string
  rejectedAt?: string
  suspendedAt?: string
  createdAt: string
  metadata?: Affiliate['metadata']
}

interface BackendCommission {
  _id: string
  affiliateId: string | { name: string; email: string }
  orderId: Commission['orderId']
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
  search?: string
  programId?: string
  sort?: string
  direction?: 'asc' | 'desc'
  page?: number
  limit?: number
}): Promise<{ items: Affiliate[]; total: number }> {
  const qs = new URLSearchParams()
  if (params?.status) qs.set('status', params.status)
  if (params?.search) qs.set('search', params.search)
  if (params?.programId) qs.set('programId', params.programId)
  if (params?.sort) qs.set('sort', params.sort)
  if (params?.direction) qs.set('direction', params.direction)
  if (params?.page)   qs.set('page',   String(params.page))
  if (params?.limit)  qs.set('limit',  String(params.limit))
  const raw = await adminApiFetch<{ items: BackendAffiliate[]; total: number }>(
    `/admin/affiliates?${qs.toString()}`
  )
  return { items: raw.items.map(mapAffiliate), total: raw.total }
}

export interface AffiliateLink {
  _id: string
  code: string
  destination: string
  label?: string
  isActive: boolean
  trackingUrl: string
  createdAt: string
}

export interface AffiliatePayout {
  _id: string
  amount: number
  status: 'pending' | 'processing' | 'paid' | 'failed'
  paymentMethod: 'upi' | 'bank_transfer' | 'wallet_credit'
  providerRef?: string
  createdAt: string
  paidAt?: string
}

export interface AdminAffiliatePayout extends Omit<AffiliatePayout, '_id'> {
  _id: string
  affiliateId: string | { _id: string; name: string; email: string }
  commissionIds: string[]
  failureReason?: string
}

export interface AffiliateProgram {
  _id: string
  name: string
  description?: string
  isActive: boolean
  isDefault: boolean
  defaultRate: number
  commissionBase: 'subtotal' | 'grand_total'
  attributionWindowDays: number
  tiers: { minOrderAmount: number; rate: number }[]
  minPayoutAmount: number
  autoApproveAfterDays: number
  affiliateCount?: number
  createdAt: string
}

export type AffiliateProgramInput = Omit<AffiliateProgram, '_id' | 'createdAt' | 'affiliateCount'>

export async function listAffiliatePrograms(): Promise<AffiliateProgram[]> {
  return (await adminApiFetch<{ items: AffiliateProgram[] }>('/admin/affiliate-programs')).items
}
export async function getAffiliateProgram(id: string): Promise<AffiliateProgram> {
  return (await adminApiFetch<{ program: AffiliateProgram }>(`/admin/affiliate-programs/${id}`)).program
}
export async function createAffiliateProgram(input: AffiliateProgramInput): Promise<AffiliateProgram> {
  return (await adminApiFetch<{ program: AffiliateProgram }>('/admin/affiliate-programs', { method: 'POST', body: input })).program
}
export async function updateAffiliateProgram(id: string, input: Partial<AffiliateProgramInput>): Promise<AffiliateProgram> {
  return (await adminApiFetch<{ program: AffiliateProgram }>(`/admin/affiliate-programs/${id}`, { method: 'PATCH', body: input })).program
}
export async function setDefaultAffiliateProgram(id: string): Promise<void> { await adminApiFetch(`/admin/affiliate-programs/${id}/default`, { method: 'POST' }) }
export async function deleteAffiliateProgram(id: string): Promise<void> { await adminApiFetch(`/admin/affiliate-programs/${id}`, { method: 'DELETE' }) }

export async function getAffiliate(id: string): Promise<{ affiliate: Affiliate; links: AffiliateLink[]; commissions: Commission[]; payouts: AffiliatePayout[] }> {
  const raw = await adminApiFetch<{ affiliate: BackendAffiliate; links: AffiliateLink[]; commissions: BackendCommission[]; payouts: AffiliatePayout[] }>(`/admin/affiliates/${id}`)
  return { ...raw, affiliate: mapAffiliate(raw.affiliate), commissions: raw.commissions.map(mapCommission) }
}

export async function createAffiliate(input: { name: string; email: string; phone?: string; channels?: string[]; programId?: string; status?: 'pending' | 'approved' }): Promise<Affiliate> {
  const raw = await adminApiFetch<{ affiliate: BackendAffiliate }>('/admin/affiliates', { method: 'POST', body: input })
  return mapAffiliate(raw.affiliate)
}

export async function updateAffiliate(id: string, input: Partial<Pick<Affiliate, 'name' | 'phone' | 'channels' | 'paymentInfo'>> & { programId?: string }): Promise<Affiliate> {
  const raw = await adminApiFetch<{ affiliate: BackendAffiliate }>(`/admin/affiliates/${id}`, { method: 'PATCH', body: input })
  return mapAffiliate(raw.affiliate)
}

export async function reactivateAffiliate(id: string): Promise<Affiliate> {
  const raw = await adminApiFetch<{ affiliate: BackendAffiliate }>(`/admin/affiliates/${id}/reactivate`, { method: 'POST' })
  return mapAffiliate(raw.affiliate)
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
  affiliateId?: string
  createdAtFrom?: string
  createdAtTo?: string
  page?: number
  limit?: number
}): Promise<{ items: Commission[]; total: number }> {
  const qs = new URLSearchParams()
  if (params?.status) qs.set('status', params.status)
  if (params?.affiliateId) qs.set('affiliateId', params.affiliateId)
  if (params?.createdAtFrom) qs.set('createdAtFrom', params.createdAtFrom)
  if (params?.createdAtTo) qs.set('createdAtTo', params.createdAtTo)
  if (params?.page)   qs.set('page',   String(params.page))
  if (params?.limit)  qs.set('limit',  String(params.limit))
  const raw = await adminApiFetch<{ items: BackendCommission[]; total: number }>(
    `/admin/commissions?${qs.toString()}`
  )
  return { items: raw.items.map(mapCommission), total: raw.total }
}

export async function bulkApproveCommissions(ids: string[]): Promise<{ approved: number; failed: number }> { return adminApiFetch('/admin/commissions/bulk-approve', { method: 'POST', body: { ids } }) }
export async function voidCommission(id: string, reason: string): Promise<void> { await adminApiFetch(`/admin/commissions/${id}/void`, { method: 'POST', body: { reason } }) }
export async function listAffiliatePayouts(params?: { status?: string; page?: number; limit?: number }): Promise<{ items: AdminAffiliatePayout[]; total: number }> { const qs=new URLSearchParams(); if(params?.status)qs.set('status',params.status);if(params?.page)qs.set('page',String(params.page));if(params?.limit)qs.set('limit',String(params.limit));return adminApiFetch(`/admin/affiliate-payouts?${qs}`) }
export async function updateAffiliatePayout(id: string, input: { status: 'processing'|'paid'|'failed'; providerRef?: string; failureReason?: string }): Promise<void> { await adminApiFetch(`/admin/affiliate-payouts/${id}`, { method: 'PATCH', body: input }) }

export interface AffiliateAnalytics {
  range: { from: string; to: string }
  totals: { clicks: number; referrals: number; sales: number; commission: number; affiliates: number; newAffiliates: number; conversionRate: number; averageOrderValue: number; commissionPerClick: number; returnOnCommission: number }
  series: { date: string; clicks: number; referrals: number; sales: number; commission: number }[]
  commissionBreakdown: { status: string; count: number; total: number }[]
  attributionBreakdown: { method: string; count: number }[]
  topAffiliates: { _id: string; name: string; email: string; sales: number; commission: number; referrals: number }[]
}
export async function getAffiliateAnalytics(params: { from: string; to: string; affiliateId?: string; programId?: string }): Promise<AffiliateAnalytics> { const qs=new URLSearchParams({from:params.from,to:params.to});if(params.affiliateId)qs.set('affiliateId',params.affiliateId);if(params.programId)qs.set('programId',params.programId);return adminApiFetch(`/admin/affiliate-analytics?${qs}`) }

export interface AffiliateSettings { registrationEnabled:boolean;autoApprove:boolean;defaultProgramId?:string|{_id:string;name:string;defaultRate:number};signupTitle:string;signupIntroduction:string;termsUrl?:string;requiredFields:string[];notificationEmail?:string }
export async function getAffiliateSettings():Promise<AffiliateSettings>{return(await adminApiFetch<{settings:AffiliateSettings}>('/admin/affiliate-settings')).settings}
export async function updateAffiliateSettings(input:AffiliateSettings):Promise<void>{await adminApiFetch('/admin/affiliate-settings',{method:'PATCH',body:input})}
export async function updateAffiliateReview(id:string,input:{internalNote?:string;fraudStatus?:'clear'|'review'|'blocked';fraudNote?:string}):Promise<void>{await adminApiFetch(`/admin/affiliates/${id}/review`,{method:'PATCH',body:input})}
export async function createAdminAffiliateLink(id:string,input:{destination:string;label?:string}):Promise<void>{await adminApiFetch(`/admin/affiliates/${id}/links`,{method:'POST',body:input})}
export async function updateAdminAffiliateLink(id:string,linkId:string,input:{destination?:string;label?:string;isActive?:boolean}):Promise<void>{await adminApiFetch(`/admin/affiliates/${id}/links/${linkId}`,{method:'PATCH',body:input})}
export async function createAffiliateImpersonation(id:string):Promise<{code:string;expiresInSeconds:number}>{return adminApiFetch(`/admin/affiliates/${id}/impersonate`,{method:'POST'})}

export async function approveCommission(id: string): Promise<void> {
  await adminApiFetch(`/admin/commissions/${id}/approve`, { method: 'POST' })
}
