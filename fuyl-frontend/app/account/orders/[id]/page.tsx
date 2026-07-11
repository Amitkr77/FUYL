'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store/authStore'
import { formatPrice } from '@/lib/utils/formatPrice'
import { getOrder } from '@/lib/api/account'
import type { Order } from '@/types/user'

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>()
  const { token } = useAuthStore()
  const [order, setOrder]     = useState<Order | null>(null)
  const [isLoading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!token || !params.id) return
    setLoading(true)
    getOrder(token, params.id)
      .then(setOrder)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load order'))
      .finally(() => setLoading(false))
  }, [token, params.id])

  if (!token) {
    return (
      <div className="container-brand section-py text-center">
        <p className="text-display-md font-display mb-4">SIGN IN TO VIEW THIS ORDER</p>
        <Link href="/account" className="inline-flex items-center justify-center h-11 px-6 text-xs font-semibold uppercase tracking-widest bg-[#8B1A4A] text-white rounded-sm hover:bg-[#C4526A] transition-colors">
          Sign In
        </Link>
      </div>
    )
  }

  return (
    <div className="container-brand section-py max-w-2xl mx-auto">
      <Link href="/account/orders" className="text-body-sm mb-6 inline-block" style={{ color: 'var(--color-brand-muted)' }}>
        ← Back to orders
      </Link>

      {isLoading && (
        <p className="text-body-md" style={{ color: 'var(--color-brand-muted)' }}>Loading order…</p>
      )}

      {!isLoading && error && (
        <p className="text-body-sm p-3 rounded-sm" style={{ background: '#FEE2E2', color: '#B91C1C' }}>{error}</p>
      )}

      {!isLoading && !error && order && (
        <>
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-display-lg font-display">{order.orderNumber}</h1>
            <span className="text-body-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-sm" style={{ background: '#F5F5F5' }}>
              {order.status}
            </span>
          </div>

          <div className="flex flex-col gap-4 mb-8">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-4">
                {item.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-sm" />
                )}
                <div className="flex-1">
                  <p className="text-body-sm font-semibold">{item.name}</p>
                  <p className="text-body-xs" style={{ color: 'var(--color-brand-muted)' }}>Qty {item.quantity}</p>
                </div>
                <p className="text-body-sm">{formatPrice(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 flex flex-col gap-2" style={{ borderColor: 'var(--color-brand-border)' }}>
            <div className="flex justify-between text-body-sm">
              <span style={{ color: 'var(--color-brand-muted)' }}>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-body-sm">
              <span style={{ color: 'var(--color-brand-muted)' }}>Shipping</span>
              <span>{order.shipping > 0 ? formatPrice(order.shipping) : 'Free'}</span>
            </div>
            <div className="flex justify-between text-body-md font-semibold">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
