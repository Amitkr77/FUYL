'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store/authStore'
import { formatPrice } from '@/lib/utils/formatPrice'
import { getOrders } from '@/lib/api/account'
import type { Order } from '@/types/user'

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
  const { token } = useAuthStore()
  const [orders, setOrders]   = useState<Order[]>([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    getOrders(token)
      .then(setOrders)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load orders'))
      .finally(() => setLoading(false))
  }, [token])

  if (!token) {
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
        <p className="text-body-md" style={{ color: 'var(--color-brand-muted)' }}>Loading orders…</p>
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
        <div className="flex flex-col gap-4">
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
