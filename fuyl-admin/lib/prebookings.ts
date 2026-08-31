import { adminApiFetch } from './api'

interface BackendLead { _id: string; name: string; email: string; phone: string; source?: string; wantsToDonate?: boolean; submittedAt: string }
export interface PrebookingLead { id: string; name: string; email: string; phone: string; source: string; wantsToDonate: boolean; submittedAt: string }
export interface PrebookingStats { total: number; today: number; capacity: number; remaining: number; donationInterested: number }

export async function listPrebookingLeads(): Promise<PrebookingLead[]> {
  const rows = await adminApiFetch<BackendLead[]>('/admin/prebookings?limit=500')
  return rows.map((row) => ({ id: row._id, name: row.name, email: row.email, phone: row.phone, source: row.source ?? 'storefront_popup', wantsToDonate: row.wantsToDonate ?? false, submittedAt: row.submittedAt }))
}

export function getPrebookingStats(): Promise<PrebookingStats> {
  return adminApiFetch('/admin/prebookings/stats')
}
