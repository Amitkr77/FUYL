import { apiFetch } from './client'

export interface WalletBalance {
  balance: number
  pendingBalance: number
  heldBalance: number
  loyaltyPoints: number
  currency: string
  isFrozen: boolean
}

interface BackendWalletTransaction {
  _id: string
  type: 'credit' | 'debit' | 'hold' | 'release' | 'reverse'
  source: string
  amount: number
  balanceBefore: number
  balanceAfter: number
  description: string
  createdAt: string
}

export interface WalletTransaction {
  id: string
  type: 'credit' | 'debit' | 'hold' | 'release' | 'reverse'
  source: string
  amount: number
  balanceAfter: number
  description: string
  createdAt: string
}

export async function getWalletBalance(token: string): Promise<WalletBalance> {
  return apiFetch<WalletBalance>('/wallet/me', { token })
}

export async function getWalletTransactions(token: string): Promise<WalletTransaction[]> {
  const raw = await apiFetch<BackendWalletTransaction[]>('/wallet/me/transactions', { token })
  return raw.map((t) => ({
    id: t._id, type: t.type, source: t.source, amount: t.amount,
    balanceAfter: t.balanceAfter, description: t.description, createdAt: t.createdAt,
  }))
}
