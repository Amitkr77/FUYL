import { apiFetch } from './client'

export type SubscriptionInterval = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly'

export interface SubscriptionPlan {
  id: string
  name: string
  description?: string
  interval: SubscriptionInterval
  intervalCount: number
  discountPercent: number
  freeShipping: boolean
}

interface BackendPlan {
  _id: string
  name: string
  description?: string
  interval: SubscriptionInterval
  intervalCount: number
  discountPercent: number
  freeShipping: boolean
}

function mapPlan(p: BackendPlan): SubscriptionPlan {
  return {
    id: p._id,
    name: p.name,
    description: p.description,
    interval: p.interval,
    intervalCount: p.intervalCount,
    discountPercent: p.discountPercent,
    freeShipping: p.freeShipping,
  }
}

// Public — the same platform-wide plan set (weekly/monthly/etc, each with
// its own discount) applies to any product with isSubscribable:true, there's
// no per-product plan assignment on the backend.
export async function getActivePlans(): Promise<SubscriptionPlan[]> {
  const raw = await apiFetch<BackendPlan[]>('/subscriptions/plans', {
    tags:       ['subscription-plans'],
    revalidate: 3600,
  })
  return raw.map(mapPlan)
}
