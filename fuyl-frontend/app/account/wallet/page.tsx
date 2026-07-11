'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store/authStore'
import { formatPrice } from '@/lib/utils/formatPrice'
import { getWalletBalance, getWalletTransactions, type WalletBalance, type WalletTransaction } from '@/lib/api/wallet'

const TYPE_LABEL: Record<WalletTransaction['type'], string> = {
  credit: 'Credit', debit: 'Debit', hold: 'Held', release: 'Released', reverse: 'Reversed',
}
const TYPE_COLOR: Record<WalletTransaction['type'], string> = {
  credit: '#10B981', debit: '#B91C1C', hold: '#F59E0B', release: '#3B82F6', reverse: '#6B7280',
}

export default function WalletPage() {
  const { token } = useAuthStore()
  const [balance, setBalance]         = useState<WalletBalance | null>(null)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [isLoading, setLoading]       = useState(true)
  const [error, setError]             = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    Promise.all([getWalletBalance(token), getWalletTransactions(token)])
      .then(([b, t]) => { setBalance(b); setTransactions(t) })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load wallet'))
      .finally(() => setLoading(false))
  }, [token])

  if (!token) {
    return (
      <div className="container-brand section-py text-center">
        <p className="text-display-md font-display mb-4">SIGN IN TO VIEW YOUR WALLET</p>
        <Link href="/account" className="inline-flex items-center justify-center h-11 px-6 text-xs font-semibold uppercase tracking-widest bg-[#8B1A4A] text-white rounded-sm hover:bg-[#C4526A] transition-colors">
          Sign In
        </Link>
      </div>
    )
  }

  return (
    <div className="container-brand section-py max-w-2xl mx-auto">
      <h1 className="text-display-xl font-display mb-10">MY WALLET</h1>

      {isLoading && (
        <p className="text-body-md" style={{ color: 'var(--color-brand-muted)' }}>Loading wallet…</p>
      )}

      {!isLoading && error && (
        <p className="text-body-sm p-3 rounded-sm" style={{ background: '#FEE2E2', color: '#B91C1C' }}>{error}</p>
      )}

      {!isLoading && !error && balance && (
        <>
          {balance.isFrozen && (
            <div className="mb-6 p-3 rounded-sm text-body-sm" style={{ background: '#FEF3C7', color: '#92400E' }}>
              Your wallet is currently frozen. Contact support for assistance.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="border rounded-sm p-5" style={{ borderColor: 'var(--color-brand-border)' }}>
              <p className="text-label mb-1.5" style={{ color: 'var(--color-brand-muted)' }}>Available Balance</p>
              <p className="text-display-md font-display">{formatPrice(balance.balance)}</p>
            </div>
            <div className="border rounded-sm p-5" style={{ borderColor: 'var(--color-brand-border)' }}>
              <p className="text-label mb-1.5" style={{ color: 'var(--color-brand-muted)' }}>Loyalty Points</p>
              <p className="text-display-md font-display">{balance.loyaltyPoints}</p>
            </div>
            {balance.heldBalance > 0 && (
              <div className="border rounded-sm p-5 col-span-2" style={{ borderColor: 'var(--color-brand-border)' }}>
                <p className="text-label mb-1.5" style={{ color: 'var(--color-brand-muted)' }}>Held (pending orders)</p>
                <p className="text-body-lg">{formatPrice(balance.heldBalance)}</p>
              </div>
            )}
          </div>

          <h2 className="text-label mb-4" style={{ color: 'var(--color-brand-muted)' }}>Transaction History</h2>
          {transactions.length === 0 ? (
            <p className="text-body-md" style={{ color: 'var(--color-brand-muted)' }}>No transactions yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-brand-border)' }}>
                  <div>
                    <p className="text-body-sm font-medium">{t.description}</p>
                    <p className="text-body-xs" style={{ color: 'var(--color-brand-muted)' }}>
                      {new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-body-sm font-semibold" style={{ color: TYPE_COLOR[t.type] }}>
                      {t.type === 'credit' || t.type === 'release' ? '+' : '-'}{formatPrice(t.amount)}
                    </p>
                    <p className="text-body-xs" style={{ color: 'var(--color-brand-muted)' }}>{TYPE_LABEL[t.type]}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
