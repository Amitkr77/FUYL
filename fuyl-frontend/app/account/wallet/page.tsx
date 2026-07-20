'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store/authStore'
import { formatPrice } from '@/lib/utils/formatPrice'
import { getWalletBalance, getWalletTransactions, type WalletBalance, type WalletTransaction } from '@/lib/api/wallet'
import { Skeleton } from '@/components/ui/Skeleton'
import { getErrorMessage } from '@/lib/api/client'

const TYPE_LABEL: Record<WalletTransaction['type'], string> = {
  credit: 'Credit', debit: 'Debit', hold: 'Held', release: 'Released', reverse: 'Reversed',
}
const TYPE_COLOR: Record<WalletTransaction['type'], string> = {
  credit: '#10B981', debit: '#B91C1C', hold: '#F59E0B', release: '#3B82F6', reverse: '#6B7280',
}

function WalletSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading wallet">
      <div className="grid grid-cols-2 gap-4 mb-10">
        <div className="border rounded-sm p-5" style={{ borderColor: 'var(--color-brand-border)' }}>
          <Skeleton className="h-3 w-24 mb-2.5" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="border rounded-sm p-5" style={{ borderColor: 'var(--color-brand-border)' }}>
          <Skeleton className="h-3 w-20 mb-2.5" />
          <Skeleton className="h-6 w-14" />
        </div>
      </div>
      <Skeleton className="h-3 w-32 mb-4" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-brand-border)' }}>
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <Skeleton className="h-3.5 w-14" />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function WalletPage() {
  const { token, user } = useAuthStore()
  const [balance, setBalance]         = useState<WalletBalance | null>(null)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [isLoading, setLoading]       = useState(true)
  const [error, setError]             = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    Promise.all([getWalletBalance(token), getWalletTransactions(token)])
      .then(([b, t]) => { setBalance(b); setTransactions(t) })
      .catch((err) => setError(getErrorMessage(err, 'Failed to load wallet')))
      .finally(() => setLoading(false))
  }, [token])

  if (!user) {
    return (
      <div className="container-brand section-py text-center">
        <p className="text-display-md font-display mb-4">SIGN IN TO VIEW YOUR WALLET</p>
        <Link href="/account" className="inline-flex items-center justify-center h-11 px-6 text-xs font-semibold uppercase tracking-widest bg-brand-forest text-white rounded-sm transition-colors hover:bg-brand-sage hover:text-brand-forest">
          Sign In
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-display-xl font-display mb-10">MY WALLET</h1>

      {isLoading && <WalletSkeleton />}

      {!isLoading && error && (
        <p className="text-body-sm p-3 rounded-sm" style={{ background: '#FEE2E2', color: '#B91C1C' }}>{error}</p>
      )}

      {!isLoading && !error && balance && (
        <div className="animate-fade-in">
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
        </div>
      )}
    </div>
  )
}
