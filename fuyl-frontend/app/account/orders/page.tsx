'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Package, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/lib/store/authStore'
import { formatPrice } from '@/lib/utils/formatPrice'
import { getOrders } from '@/lib/api/account'
import { Skeleton } from '@/components/ui/Skeleton'
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge'
import type { Order } from '@/types/user'
import { getErrorMessage } from '@/lib/api/client'

type FilterKey = 'all' | 'active' | 'delivered' | 'cancelled'

const FILTERS: { key: FilterKey; label: string; match: (s: string) => boolean }[] = [
  { key: 'all',       label: 'All',       match: () => true },
  { key: 'active',    label: 'Active',    match: (s) => ['pending', 'confirmed', 'packed', 'shipped'].includes(s) },
  { key: 'delivered', label: 'Delivered', match: (s) => ['delivered', 'completed'].includes(s) },
  { key: 'cancelled', label: 'Cancelled', match: (s) => ['cancelled', 'returned'].includes(s) },
]

function OrderCardSkeleton() {
  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--color-brand-border)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-lg" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--color-brand-border)' }}>
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3.5 w-24" />
      </div>
    </div>
  )
}

function Thumbnails({ order }: { order: Order }) {
  const withImages = order.items.filter((i) => i.image)
  const shown = withImages.slice(0, 3)
  const extra = order.items.length - shown.length

  if (shown.length === 0) {
    return (
      <div className="w-12 h-12 rounded-lg bg-brand-sage/40 flex items-center justify-center shrink-0">
        <Package size={18} className="text-brand-forest/60" />
      </div>
    )
  }

  return (
    <div className="flex -space-x-3 shrink-0">
      {shown.map((item, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={item.id}
          src={item.image}
          alt={item.name}
          className="w-12 h-12 rounded-lg object-cover ring-2 ring-white"
          style={{ zIndex: shown.length - i }}
        />
      ))}
      {extra > 0 && (
        <div className="w-12 h-12 rounded-lg ring-2 ring-white bg-brand-sage/50 flex items-center justify-center text-[11px] font-semibold text-brand-forest">
          +{extra}
        </div>
      )}
    </div>
  )
}

export default function OrdersPage() {
  const { token, user } = useAuthStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterKey>('all')

  useEffect(() => {
    if (!token) return
    setLoading(true)
    getOrders(token)
      .then(setOrders)
      .catch((err) => setError(getErrorMessage(err, 'Failed to load orders')))
      .finally(() => setLoading(false))
  }, [token])

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: orders.length, active: 0, delivered: 0, cancelled: 0 }
    for (const o of orders) {
      for (const f of FILTERS) if (f.key !== 'all' && f.match(o.status)) c[f.key]++
    }
    return c
  }, [orders])

  const visible = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter)!
    return orders.filter((o) => f.match(o.status))
  }, [orders, filter])

  if (!user) {
    return (
      <div className="container-brand section-py text-center">
        <p className="text-display-md font-display mb-4">SIGN IN TO VIEW ORDERS</p>
        <Link href="/account" className="inline-flex items-center justify-center h-11 px-6 text-xs font-semibold uppercase tracking-widest bg-brand-forest text-white rounded-sm transition-colors hover:bg-brand-sage hover:text-brand-forest">
          Sign In
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-display-xl font-display text-brand-forest">MY ORDERS</h1>
        {!isLoading && !error && orders.length > 0 && (
          <p className="text-body-sm text-brand-muted mt-1">
            {orders.length} order{orders.length === 1 ? '' : 's'} placed
          </p>
        )}
      </div>

      {/* Filter tabs */}
      {!isLoading && !error && orders.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {FILTERS.map((f) => {
            const active = filter === f.key
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`h-9 px-4 rounded-full text-body-xs font-semibold uppercase tracking-wide transition-colors border ${
                  active
                    ? 'bg-brand-forest text-white border-brand-forest'
                    : 'bg-transparent text-brand-muted border-brand-border hover:border-brand-forest/40'
                }`}
              >
                {f.label}
                <span className={active ? 'text-white/70' : 'text-brand-muted/70'}> ({counts[f.key]})</span>
              </button>
            )
          })}
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading orders">
          {Array.from({ length: 3 }).map((_, i) => (
            <OrderCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!isLoading && error && (
        <p className="text-body-sm p-3 rounded-sm" style={{ background: '#FEE2E2', color: '#B91C1C' }}>{error}</p>
      )}

      {/* Empty — no orders at all */}
      {!isLoading && !error && orders.length === 0 && (
        <div className="flex flex-col items-center text-center py-16 px-6 rounded-2xl border" style={{ borderColor: 'var(--color-brand-border)' }}>
          <div className="w-14 h-14 rounded-full bg-brand-sage/40 flex items-center justify-center mb-4">
            <Package size={24} className="text-brand-forest/60" />
          </div>
          <p className="text-body-lg font-semibold text-brand-forest mb-1">No orders yet</p>
          <p className="text-body-sm text-brand-muted mb-6 max-w-xs">
            When you place an order, it&apos;ll show up here so you can track it.
          </p>
          <Link href="/collections/all" className="inline-flex items-center justify-center h-11 px-8 text-xs font-semibold uppercase tracking-widest bg-brand-forest text-white rounded-sm transition-colors hover:bg-brand-sage hover:text-brand-forest">
            Start Shopping
          </Link>
        </div>
      )}

      {/* Empty — filter has no matches */}
      {!isLoading && !error && orders.length > 0 && visible.length === 0 && (
        <p className="text-body-sm text-brand-muted py-10 text-center">No {filter} orders.</p>
      )}

      {!isLoading && !error && visible.length > 0 && (
        <div className="flex flex-col gap-4 animate-fade-in">
          {visible.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${order.id}`}
              className="group block rounded-2xl border p-5 transition-all hover:border-brand-forest/40 hover:shadow-[0_2px_16px_rgba(18,41,31,0.06)]"
              style={{ borderColor: 'var(--color-brand-border)' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Thumbnails order={order} />
                  <div className="min-w-0">
                    <p className="text-body-sm font-semibold text-brand-forest truncate">{order.orderNumber}</p>
                    <p className="text-body-xs text-brand-muted mt-0.5">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' · '}
                      {order.items.length} item{order.items.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-brand-border)' }}>
                <span className="text-body-md font-semibold text-brand-forest">{formatPrice(order.total)}</span>
                <span className="inline-flex items-center gap-1 text-body-xs font-semibold text-brand-teal">
                  View details
                  <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
