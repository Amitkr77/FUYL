import { apiFetch } from './client'

export interface ReferralDashboard {
  code: string | null
  shareLink: string | null
  stats: {
    totalReferrals: number
    totalRewarded: number
    totalEarned: number
    pending: number
  }
  recent: Array<{
    _id: string
    status: string
    sharedAt: string
    rewardedAt?: string
  }>
}

export async function getReferralDashboard(token: string): Promise<ReferralDashboard> {
  return apiFetch<ReferralDashboard>('/referrals/me', { token })
}

export async function generateReferralCode(token: string): Promise<{ code: string }> {
  return apiFetch<{ code: string }>('/referrals/code', { method: 'POST', token })
}

export async function applyReferralCode(token: string, code: string): Promise<void> {
  await apiFetch('/referrals/apply', { method: 'POST', body: { code }, token })
}

export interface ReferralReward {
  _id: string
  role: 'referrer' | 'referee'
  type: string
  amount: number
  currency: string
  isReversed: boolean
  createdAt: string
}

export async function getMyRewards(token: string): Promise<ReferralReward[]> {
  return apiFetch<ReferralReward[]>('/referrals/me/rewards', { token })
}

export async function shareReferral(
  token: string,
  channel: 'whatsapp' | 'email' | 'sms' | 'link',
  to?: string
): Promise<{ link: string; message?: string; subject?: string; body?: string }> {
  return apiFetch('/referrals/share', { method: 'POST', body: { channel, to }, token })
}
