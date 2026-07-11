import { adminApiFetch, AdminApiError } from './api'

// ─── Customer search (reuses the existing admin customer-list endpoint) ────
interface BackendCustomerHit {
  id: string
  name: string
  email: string
}

export interface CustomerHit {
  id: string
  name: string
  email: string
}

export async function searchCustomers(query: string): Promise<CustomerHit[]> {
  if (!query.trim()) return []
  const qs = new URLSearchParams({ search: query, limit: '10' })
  const raw = await adminApiFetch<BackendCustomerHit[]>(`/admin/customers?${qs.toString()}`)
  return raw.map((c) => ({ id: c.id, name: c.name, email: c.email }))
}

// ─── Wallet ──────────────────────────────────────────────────────────────
interface BackendWalletBalance {
  balance: number
  pendingBalance: number
  heldBalance: number
  loyaltyPoints: number
  currency: string
  isFrozen: boolean
}

export interface WalletBalance {
  balance: number
  pendingBalance: number
  heldBalance: number
  loyaltyPoints: number
  currency: string
  isFrozen: boolean
}

function mapBalance(w: BackendWalletBalance): WalletBalance {
  return { ...w }
}

export async function getWalletBalance(userId: string): Promise<WalletBalance | null> {
  try {
    return mapBalance(await adminApiFetch<BackendWalletBalance>(`/admin/wallet/${userId}`))
  } catch {
    return null
  }
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
  balanceBefore: number
  balanceAfter: number
  description: string
  createdAt: string
}

export async function getWalletTransactions(userId: string): Promise<WalletTransaction[]> {
  const raw = await adminApiFetch<BackendWalletTransaction[]>(`/admin/wallet/${userId}/transactions`)
  return raw.map((t) => ({
    id: t._id, type: t.type, source: t.source, amount: t.amount,
    balanceBefore: t.balanceBefore, balanceAfter: t.balanceAfter,
    description: t.description, createdAt: t.createdAt,
  }))
}

export async function adjustWallet(input: {
  userId: string
  amount: number
  type: 'credit' | 'debit'
  description: string
}): Promise<void> {
  await adminApiFetch('/admin/wallet/adjust', {
    method: 'POST',
    body: { ...input, source: 'admin_adjustment' },
  })
}

export async function setWalletFrozen(userId: string, frozen: boolean, reason?: string): Promise<void> {
  await adminApiFetch(`/admin/wallet/${userId}/${frozen ? 'freeze' : 'unfreeze'}`, {
    method: 'POST',
    body: frozen ? { reason: reason || 'Frozen by admin' } : undefined,
  })
}

export { AdminApiError }
