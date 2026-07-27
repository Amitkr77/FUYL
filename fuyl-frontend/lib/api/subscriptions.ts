import { apiFetch } from './client'

export type SubscriptionStatus = 'pending' | 'active' | 'paused' | 'past_due' | 'cancelled' | 'expired'

interface BackendSubscription {
  _id: string
  productId: string
  productName: string
  productImage: string
  status: SubscriptionStatus
  interval: string
  intervalCount: number
  finalPrice: number
  currency: string
  nextDeliveryDate: string
  totalCyclesExecuted: number
  consecutiveFailures: number
}

export interface Subscription {
  id: string
  productName: string
  productImage: string
  status: SubscriptionStatus
  interval: string
  intervalCount: number
  finalPrice: number
  currency: string
  nextDeliveryDate: string
  totalCyclesExecuted: number
  consecutiveFailures: number
}

function mapSub(s: BackendSubscription): Subscription {
  return {
    id: s._id, productName: s.productName, productImage: s.productImage, status: s.status,
    interval: s.interval, intervalCount: s.intervalCount, finalPrice: s.finalPrice, currency: s.currency,
    nextDeliveryDate: s.nextDeliveryDate, totalCyclesExecuted: s.totalCyclesExecuted,
    consecutiveFailures: s.consecutiveFailures,
  }
}

export interface CreateSubscriptionInput {
  planId:     string
  productId:  string
  variantId?: string
  quantity?:  number
  addressId?: string
}

// The new subscription is created PENDING; `mode` + one of
// subscriptionSessionId/authLink is used (via lib/utils/cashfree
// authorizeSubscription) to run the mandate-authorization step. Cashfree then
// fires the ACTIVE webhook once the customer authorizes.
export interface CreateSubscriptionResult {
  subscriptionId:        string
  mode:                  'sandbox' | 'production'
  subscriptionSessionId?: string
  authLink?:             string
}

export async function createSubscription(
  token: string,
  input: CreateSubscriptionInput,
): Promise<CreateSubscriptionResult> {
  const raw = await apiFetch<{
    subscription: { _id: string }
    cashfree?: { subscriptionSessionId?: string; authLink?: string; mode?: 'sandbox' | 'production' }
  }>('/subscriptions', {
    method: 'POST',
    body:   { ...input, paymentMethod: 'cashfree' },
    token,
  })
  return {
    subscriptionId:        raw.subscription._id,
    mode:                  raw.cashfree?.mode ?? 'sandbox',
    subscriptionSessionId: raw.cashfree?.subscriptionSessionId,
    authLink:              raw.cashfree?.authLink,
  }
}

export async function getMySubscriptions(token: string): Promise<Subscription[]> {
  const raw = await apiFetch<BackendSubscription[]>('/subscriptions/me', { token })
  return raw.map(mapSub)
}

export async function pauseSubscription(token: string, id: string): Promise<void> {
  await apiFetch(`/subscriptions/${id}/pause`, { method: 'PATCH', token })
}

export async function resumeSubscription(token: string, id: string): Promise<void> {
  await apiFetch(`/subscriptions/${id}/resume`, { method: 'PATCH', token })
}

export async function skipNextDelivery(token: string, id: string): Promise<void> {
  await apiFetch(`/subscriptions/${id}/skip`, { method: 'POST', token })
}

export async function cancelSubscription(token: string, id: string, reason: string): Promise<void> {
  await apiFetch(`/subscriptions/${id}/cancel`, { method: 'POST', body: { reason }, token })
}
