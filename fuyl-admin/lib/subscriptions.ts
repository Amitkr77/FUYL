import { adminApiFetch, AdminApiError } from './api'

export type SubscriptionStatus = 'pending' | 'active' | 'paused' | 'past_due' | 'cancelled' | 'expired'

export interface SubscriptionStats {
  active: number
  paused: number
  pastDue: number
  cancelled: number
  mrr: number
}

export async function getSubscriptionStats(): Promise<SubscriptionStats> {
  return adminApiFetch<SubscriptionStats>('/admin/subscription/dashboard')
}

interface BackendSubscription {
  _id: string
  customerId: string
  productName: string
  status: SubscriptionStatus
  interval: string
  intervalCount: number
  finalPrice: number
  currency: string
  nextDeliveryDate: string
  totalCyclesExecuted: number
  consecutiveFailures: number
  createdAt: string
}

export interface Subscription {
  id: string
  customerId: string
  productName: string
  status: SubscriptionStatus
  interval: string
  intervalCount: number
  finalPrice: number
  currency: string
  nextDeliveryDate: string
  totalCyclesExecuted: number
  consecutiveFailures: number
  createdAt: string
}

export async function listSubscriptions(status?: SubscriptionStatus): Promise<Subscription[]> {
  const qs = new URLSearchParams({ limit: '100' })
  if (status) qs.set('status', status)
  const raw = await adminApiFetch<BackendSubscription[]>(`/admin/subscription?${qs.toString()}`)
  return raw.map((s) => ({
    id: s._id, customerId: s.customerId, productName: s.productName, status: s.status,
    interval: s.interval, intervalCount: s.intervalCount, finalPrice: s.finalPrice, currency: s.currency,
    nextDeliveryDate: s.nextDeliveryDate, totalCyclesExecuted: s.totalCyclesExecuted,
    consecutiveFailures: s.consecutiveFailures, createdAt: s.createdAt,
  }))
}

export { AdminApiError }
