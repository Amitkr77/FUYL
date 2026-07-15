'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store/authStore'
import { formatPrice } from '@/lib/utils/formatPrice'
import {
  getMySubscriptions, pauseSubscription, resumeSubscription, skipNextDelivery, cancelSubscription,
  type Subscription,
} from '@/lib/api/subscriptions'

const STATUS_COLOR: Record<Subscription['status'], string> = {
  active: '#10B981', paused: '#F59E0B', past_due: '#B91C1C',
  cancelled: '#6B7280', expired: '#6B7280', pending: '#3B82F6',
}

export default function SubscriptionsPage() {
  const { token } = useAuthStore()
  const [subs, setSubs]         = useState<Subscription[]>([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [busyId, setBusyId]     = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = () => {
    if (!token) return
    setLoading(true)
    getMySubscriptions(token)
      .then(setSubs)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load subscriptions'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [token])

  const runAction = async (id: string, action: () => Promise<void>) => {
    if (!token) return
    setActionError(null)
    setBusyId(id)
    try {
      await action()
      load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusyId(null)
    }
  }

  if (!token) {
    return (
      <div className="container-brand section-py text-center">
        <p className="text-display-md font-display mb-4">SIGN IN TO VIEW YOUR SUBSCRIPTIONS</p>
        <Link href="/account" className="inline-flex items-center justify-center h-11 px-6 text-xs font-semibold uppercase tracking-widest bg-brand-forest text-white rounded-sm transition-colors hover:bg-brand-sage hover:text-brand-forest">
          Sign In
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-display-xl font-display mb-10">MY SUBSCRIPTIONS</h1>

      {isLoading && <p className="text-body-md" style={{ color: 'var(--color-brand-muted)' }}>Loading subscriptions…</p>}
      {!isLoading && error && (
        <p className="text-body-sm p-3 rounded-sm" style={{ background: '#FEE2E2', color: '#B91C1C' }}>{error}</p>
      )}
      {actionError && (
        <p className="text-body-sm p-3 rounded-sm mb-4" style={{ background: '#FEE2E2', color: '#B91C1C' }}>{actionError}</p>
      )}

      {!isLoading && !error && subs.length === 0 && (
        <p className="text-body-md" style={{ color: 'var(--color-brand-muted)' }}>You don&apos;t have any active subscriptions.</p>
      )}

      {!isLoading && !error && subs.length > 0 && (
        <div className="flex flex-col gap-5">
          {subs.map((s) => {
            const busy = busyId === s.id
            return (
              <div key={s.id} className="border rounded-sm p-5" style={{ borderColor: 'var(--color-brand-border)' }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {s.productImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.productImage} alt={s.productName} className="w-14 h-14 object-cover rounded-sm" />
                    )}
                    <div>
                      <p className="text-body-md font-semibold">{s.productName}</p>
                      <p className="text-body-xs" style={{ color: 'var(--color-brand-muted)' }}>
                        Every {s.intervalCount > 1 ? `${s.intervalCount} ` : ''}{s.interval} · {formatPrice(s.finalPrice)}
                      </p>
                    </div>
                  </div>
                  <span
                    className="text-body-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-sm whitespace-nowrap"
                    style={{ color: STATUS_COLOR[s.status], background: `${STATUS_COLOR[s.status]}1A` }}
                  >
                    {s.status.replace('_', ' ')}
                  </span>
                </div>

                {s.consecutiveFailures > 0 && (
                  <p className="text-body-xs mb-3" style={{ color: '#B91C1C' }}>
                    Last {s.consecutiveFailures} charge attempt{s.consecutiveFailures === 1 ? '' : 's'} failed — please check your payment method.
                  </p>
                )}

                {(s.status === 'active' || s.status === 'paused') && (
                  <p className="text-body-xs mb-4" style={{ color: 'var(--color-brand-muted)' }}>
                    Next delivery: {new Date(s.nextDeliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}{s.totalCyclesExecuted} deliveries so far
                  </p>
                )}

                {/* Cancel is allowed from any non-terminal status (matches
                    subscription.service.ts's cancel() — only 'cancelled'
                    itself is rejected), so a subscription stuck in
                    'pending' still has a way out. Pause/resume/skip stay
                    restricted to the exact statuses the backend requires. */}
                {s.status !== 'cancelled' && s.status !== 'expired' && (
                  <div className="flex flex-wrap gap-2">
                    {s.status === 'active' && (
                      <>
                        <ActionButton disabled={busy} onClick={() => runAction(s.id, () => pauseSubscription(token, s.id))}>
                          Pause
                        </ActionButton>
                        <ActionButton disabled={busy} onClick={() => runAction(s.id, () => skipNextDelivery(token, s.id))}>
                          Skip Next Delivery
                        </ActionButton>
                      </>
                    )}
                    {s.status === 'paused' && (
                      <ActionButton disabled={busy} primary onClick={() => runAction(s.id, () => resumeSubscription(token, s.id))}>
                        Resume
                      </ActionButton>
                    )}
                    <ActionButton
                      disabled={busy}
                      danger
                      onClick={() => {
                        if (confirm('Cancel this subscription? This cannot be undone.')) {
                          runAction(s.id, () => cancelSubscription(token, s.id, 'Cancelled by customer'))
                        }
                      }}
                    >
                      Cancel
                    </ActionButton>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ActionButton({ children, onClick, disabled, primary, danger }: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  primary?: boolean
  danger?: boolean
}) {
  const style = primary
    ? { background: 'var(--color-brand-forest)', color: 'white' }
    : danger
    ? { background: 'transparent', color: '#B91C1C', border: '1px solid #B91C1C' }
    : { background: 'transparent', color: 'var(--color-brand-forest)', border: '1px solid var(--color-brand-border)' }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="h-9 px-4 text-xs font-semibold uppercase tracking-widest rounded-sm transition-opacity disabled:opacity-50"
      style={style}
    >
      {children}
    </button>
  )
}
