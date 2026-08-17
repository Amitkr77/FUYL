'use client'

import { useEffect, useState, startTransition } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store/authStore'
import { formatPrice } from '@/lib/utils/formatPrice'
import {
  getLoyaltyBalance,
  getLoyaltyTransactions,
  type LoyaltyBalance,
  type LoyaltyTransaction,
} from '@/lib/api/loyalty'
import { Skeleton } from '@/components/ui/Skeleton'
import { getErrorMessage } from '@/lib/api/client'

const TX_LABEL: Record<LoyaltyTransaction['type'], string> = {
  earn:    'Earned',
  redeem:  'Redeemed',
  reverse: 'Reversed',
  expire:  'Expired',
  adjust:  'Adjusted',
}

const TX_COLOR: Record<LoyaltyTransaction['type'], string> = {
  earn:    '#10B981',   // green
  redeem:  '#F59E0B',   // amber
  reverse: '#6B7280',   // grey
  expire:  '#B91C1C',   // red
  adjust:  '#6366F1',   // indigo
}

function LoyaltySkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading loyalty points">
      <div className="grid grid-cols-2 gap-4 mb-10">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="border rounded-sm p-5" style={{ borderColor: 'var(--color-brand-border)' }}>
            <Skeleton className="h-3 w-24 mb-2.5" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
      <Skeleton className="h-3 w-32 mb-4" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--color-brand-border)' }}>
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LoyaltyPage() {
  const { token, user } = useAuthStore()
  const [balance, setBalance]           = useState<LoyaltyBalance | null>(null)
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([])
  const [isLoading, setLoading]         = useState(true)
  const [error, setError]               = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    startTransition(() => setLoading(true))
    Promise.all([
      getLoyaltyBalance(token),
      getLoyaltyTransactions(token, 1, 30),
    ])
      .then(([b, { items }]) => { setBalance(b); setTransactions(items) })
      .catch((err) => setError(getErrorMessage(err, 'Failed to load loyalty points')))
      .finally(() => startTransition(() => setLoading(false)))
  }, [token])

  if (!user) {
    return (
      <div className="container-brand section-py text-center">
        <p className="text-display-md font-display mb-4">SIGN IN TO VIEW YOUR POINTS</p>
        <Link
          href="/account"
          className="inline-flex items-center justify-center h-11 px-6 text-xs font-semibold uppercase tracking-widest bg-brand-forest text-white rounded-sm transition-colors hover:bg-brand-sage hover:text-brand-forest"
        >
          Sign In
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-display-xl font-display mb-10">LOYALTY POINTS</h1>

      {isLoading && <LoyaltySkeleton />}

      {!isLoading && error && (
        <p className="text-body-sm p-3 rounded-sm" style={{ background: '#FEE2E2', color: '#B91C1C' }}>
          {error}
        </p>
      )}

      {!isLoading && !error && balance && (
        <div className="animate-fade-in">
          {/* Balance overview */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="border rounded-sm p-5 col-span-2 sm:col-span-1" style={{ borderColor: 'var(--color-brand-border)' }}>
              <p className="text-label mb-1.5" style={{ color: 'var(--color-brand-muted)' }}>Points Balance</p>
              <p className="text-display-md font-display">{balance.balance.toLocaleString('en-IN')} pts</p>
              {balance.redeemableValue > 0 && (
                <p className="text-body-xs mt-1" style={{ color: 'var(--color-brand-muted)' }}>
                  Worth {formatPrice(balance.redeemableValue)} at checkout
                </p>
              )}
            </div>
            <div className="border rounded-sm p-5" style={{ borderColor: 'var(--color-brand-border)' }}>
              <p className="text-label mb-1.5" style={{ color: 'var(--color-brand-muted)' }}>Lifetime Earned</p>
              <p className="text-display-sm font-display">{balance.lifetimeEarned.toLocaleString('en-IN')} pts</p>
            </div>
            <div className="border rounded-sm p-5" style={{ borderColor: 'var(--color-brand-border)' }}>
              <p className="text-label mb-1.5" style={{ color: 'var(--color-brand-muted)' }}>Lifetime Redeemed</p>
              <p className="text-display-sm font-display">{balance.lifetimeRedeemed.toLocaleString('en-IN')} pts</p>
            </div>
          </div>

          {/* Redemption status / CTA */}
          {balance.balance === 0 ? (
            <div className="rounded-2xl p-5 mb-10 text-center" style={{ background: 'var(--color-brand-cream)' }}>
              <p className="text-body-md font-semibold text-brand-forest mb-1">Start earning points</p>
              <p className="text-body-sm text-brand-muted">
                You earn points on every delivered order. Place your first order to get started.
              </p>
              <Link
                href="/collections/all"
                className="inline-flex items-center justify-center h-10 px-5 mt-4 text-xs font-semibold uppercase tracking-widest bg-brand-forest text-white rounded-sm transition-colors hover:bg-brand-teal"
              >
                Shop Now
              </Link>
            </div>
          ) : balance.canRedeem ? (
            <div className="rounded-2xl p-5 mb-10" style={{ background: 'var(--color-brand-cream)' }}>
              <p className="text-body-md font-semibold text-brand-forest mb-1">
                You have {formatPrice(balance.redeemableValue)} in points ready to use
              </p>
              <p className="text-body-sm text-brand-muted mb-4">
                Apply your points at checkout for an instant discount on your next order.
              </p>
              <Link
                href="/cart"
                className="inline-flex items-center justify-center h-10 px-5 text-xs font-semibold uppercase tracking-widest bg-brand-forest text-white rounded-sm transition-colors hover:bg-brand-teal"
              >
                Go to Cart
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl p-5 mb-10" style={{ background: 'var(--color-brand-cream)' }}>
              <p className="text-body-md font-semibold text-brand-forest mb-1">Almost there</p>
              <p className="text-body-sm text-brand-muted">
                You need {balance.minRedeemPoints.toLocaleString('en-IN')} pts to redeem.{' '}
                {balance.minRedeemPoints - balance.balance > 0 && (
                  <>{(balance.minRedeemPoints - balance.balance).toLocaleString('en-IN')} more to go.</>
                )}
              </p>
              {/* Progress bar */}
              <div className="mt-3 h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'var(--color-brand-border)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (balance.balance / balance.minRedeemPoints) * 100)}%`,
                    background: 'var(--color-brand-teal)',
                  }}
                />
              </div>
              <p className="text-body-xs mt-1.5" style={{ color: 'var(--color-brand-muted)' }}>
                {balance.balance.toLocaleString('en-IN')} / {balance.minRedeemPoints.toLocaleString('en-IN')} pts
              </p>
            </div>
          )}

          {/* Transaction history */}
          <h2 className="text-label mb-4" style={{ color: 'var(--color-brand-muted)' }}>Transaction History</h2>
          {transactions.length === 0 ? (
            <p className="text-body-md" style={{ color: 'var(--color-brand-muted)' }}>No transactions yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {transactions.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between border-b pb-3"
                  style={{ borderColor: 'var(--color-brand-border)' }}
                >
                  <div>
                    <p className="text-body-sm font-medium">{t.description}</p>
                    <p className="text-body-xs" style={{ color: 'var(--color-brand-muted)' }}>
                      {new Date(t.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-body-sm font-semibold" style={{ color: TX_COLOR[t.type] }}>
                      {t.points > 0 ? '+' : ''}{t.points.toLocaleString('en-IN')} pts
                    </p>
                    <p className="text-body-xs" style={{ color: 'var(--color-brand-muted)' }}>
                      {TX_LABEL[t.type]}
                    </p>
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
