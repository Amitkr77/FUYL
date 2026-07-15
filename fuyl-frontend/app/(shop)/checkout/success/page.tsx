'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuthStore } from '@/lib/store/authStore'
import { getOrder } from '@/lib/api/account'
import { formatPrice } from '@/lib/utils/formatPrice'
import type { Order } from '@/types/user'

export default function CheckoutSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const { token } = useAuthStore()

  const [order, setOrder]     = useState<Order | null>(null)
  const [isLoading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!token) { router.replace('/account'); return }
    if (!orderId) { router.replace('/collections/all'); return }
    setLoading(true)
    getOrder(token, orderId)
      .then(setOrder)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load your order'))
      .finally(() => setLoading(false))
  }, [token, orderId, router])

  if (!token || !orderId) return null

  return (
    <div className="container-brand section-py max-w-xl mx-auto">
      <div className="flex flex-col items-center text-center mb-10">
        <span className="w-16 h-16 rounded-full bg-brand-sage/70 text-brand-forest flex items-center justify-center mb-5">
          <CheckCircle2 size={32} />
        </span>
        <h1 className="text-display-xl font-display text-brand-forest mb-3">ORDER CONFIRMED</h1>
        <p className="text-body-md text-brand-muted max-w-md">
          Thank you{order ? ` — order ${order.orderNumber} is on its way` : ''}. We&apos;ve sent a confirmation to your email.
        </p>
      </div>

      {isLoading && (
        <p className="text-body-md text-brand-muted text-center mb-8">Loading your order…</p>
      )}

      {!isLoading && error && (
        <p className="text-body-sm p-3 rounded-sm bg-red-50 text-red-700 text-center mb-8">{error}</p>
      )}

      {!isLoading && !error && order && (
        <div className="border border-brand-border rounded-2xl p-6 sm:p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-label text-brand-muted mb-1">Order Number</p>
              <p className="text-body-md font-semibold text-brand-forest">{order.orderNumber}</p>
            </div>
            <Badge variant="success">{order.status}</Badge>
          </div>

          <div className="flex flex-col gap-4 mb-6">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-4">
                {item.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt={item.name} className="w-14 h-14 object-cover rounded-sm" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm font-semibold truncate">{item.name}</p>
                  <p className="text-body-xs text-brand-muted">Qty {item.quantity}</p>
                </div>
                <p className="text-body-sm">{formatPrice(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-brand-border pt-4 flex flex-col gap-2">
            <div className="flex justify-between text-body-sm text-brand-muted">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-body-sm text-brand-muted">
              <span>Shipping</span>
              <span>{order.shipping > 0 ? formatPrice(order.shipping) : 'Free'}</span>
            </div>
            <div className="flex justify-between text-body-md font-semibold text-brand-forest">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          size="lg"
          fullWidth
          disabled={!order}
          onClick={() => order && router.push(`/account/orders/${order.id}`)}
        >
          View Order
        </Button>
        <Button variant="primary" size="lg" fullWidth onClick={() => router.push('/collections/all')}>
          Continue Shopping
        </Button>
      </div>
    </div>
  )
}
