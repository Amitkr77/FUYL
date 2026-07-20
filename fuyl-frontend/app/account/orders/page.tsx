'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store/authStore'
import { formatPrice } from '@/lib/utils/formatPrice'
import { getOrders } from '@/lib/api/account'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Order } from '@/types/user'
import { getErrorMessage } from '@/lib/api/client'

function OrderCardSkeleton() {
  return (
    <div className="border rounded-sm p-5" style={{ borderColor: 'var(--color-brand-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-5 w-20" />
      </div>
      <Skeleton className="h-3.5 w-40 mb-3" />
      <Skeleton className="h-4 w-24" />
    </div>
  )
}

const STATUS_COLORS: Record<string, string> = {
  pending:   '#F59E0B',
  confirmed: '#3B82F6',
  packed:    '#3B82F6',
  shipped:   '#12291F',
  delivered: '#10B981',
  completed: '#10B981',
  cancelled: '#6B7280',
  returned:  '#6B7280',
}

export default function OrdersPage() {
  const { token, user } = useAuthStore()
  const [orders, setOrders]   = useState<Order[]>([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    getOrders(token)
      .then(setOrders)
      .catch((err) => setError(getErrorMessage(err, 'Failed to load orders')))
      .finally(() => setLoading(false))
  }, [token])

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
      <h1 className="text-display-xl font-display mb-10">MY ORDERS</h1>

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

      {!isLoading && !error && orders.length === 0 && (
        <p className="text-body-md" style={{ color: 'var(--color-brand-muted)' }}>
          You haven&apos;t placed any orders yet.
        </p>
      )}

      {!isLoading && !error && orders.length > 0 && (
        <div className="flex flex-col gap-4 animate-fade-in">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${order.id}`}
              className="block border rounded-sm p-5 hover:border-brand-forest transition-colors"
              style={{ borderColor: 'var(--color-brand-border)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-label font-semibold">{order.orderNumber}</span>
                <span
                  className="text-body-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-sm"
                  style={{ color: STATUS_COLORS[order.status] ?? '#6B7280', background: `${STATUS_COLORS[order.status] ?? '#6B7280'}1A` }}
                >
                  {order.status}
                </span>
              </div>
              <p className="text-body-sm mb-2" style={{ color: 'var(--color-brand-muted)' }}>
                {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                {' · '}
                {order.items.length} item{order.items.length === 1 ? '' : 's'}
              </p>
              <p className="text-body-md font-semibold">{formatPrice(order.total)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
