import { adminApiFetch, AdminApiError } from './api'

export type NewsletterStatus = 'pending' | 'active' | 'unsubscribed'

export interface NewsletterStats {
  total: number
  active: number
  pending: number
  unsubscribed: number
}

export async function getNewsletterStats(): Promise<NewsletterStats> {
  return adminApiFetch<NewsletterStats>('/admin/newsletter/stats')
}

interface BackendSubscriber {
  _id: string
  email: string
  status: NewsletterStatus
  source?: string
  subscribedAt: string
  verifiedAt?: string | null
  unsubscribedAt?: string | null
  createdAt: string
}

export interface Subscriber {
  id: string
  email: string
  status: NewsletterStatus
  source: string
  subscribedAt: string
  verifiedAt: string | null
  unsubscribedAt: string | null
  createdAt: string
}

export async function listSubscribers(status?: NewsletterStatus): Promise<Subscriber[]> {
  const qs = new URLSearchParams({ limit: '500' })
  if (status) qs.set('status', status)
  const raw = await adminApiFetch<BackendSubscriber[]>(`/admin/newsletter?${qs.toString()}`)
  return raw.map((s) => ({
    id: s._id,
    email: s.email,
    status: s.status,
    source: s.source ?? 'website',
    subscribedAt: s.subscribedAt,
    verifiedAt: s.verifiedAt ?? null,
    unsubscribedAt: s.unsubscribedAt ?? null,
    createdAt: s.createdAt,
  }))
}

export async function resendSubscriberVerification(email: string): Promise<void> {
  await adminApiFetch(`/admin/newsletter/${encodeURIComponent(email)}/resend`, {
    method: 'POST',
  })
}

export async function deleteSubscriber(id: string): Promise<void> {
  await adminApiFetch(`/admin/newsletter/${id}`, { method: 'DELETE' })
}

export { AdminApiError }
