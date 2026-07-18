'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Truck, CreditCard } from 'lucide-react'
import { useAuthStore } from '@/lib/store/authStore'
import { formatPrice } from '@/lib/utils/formatPrice'
import { getOrder } from '@/lib/api/account'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Order, OrderAddress } from '@/types/user'
import { getErrorMessage } from '@/lib/api/client'

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

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  razorpay: 'Card / UPI / Netbanking',
  upi: 'UPI',
  cod: 'Cash on Delivery',
  wallet: 'Wallet',
  split: 'Split Payment',
}

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  success: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
  partially_refunded: 'Partially Refunded',
}

function formatDateTime(value?: string) {
  if (!value) return null
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

function addressesMatch(a: OrderAddress, b: OrderAddress) {
  return a.line1 === b.line1 && a.city === b.city && a.state === b.state && a.pincode === b.pincode && a.phone === b.phone
}

function OrderDetailSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Loading order">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-7 w-24" />
      </div>

      <div className="border border-brand-border rounded-2xl p-5 sm:p-6">
        <Skeleton className="h-3 w-28 mb-4" />
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" />
              <div className="flex flex-col gap-1.5 flex-1">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Skeleton className="h-3 w-12 mb-4" />
        <div className="flex flex-col gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="w-16 h-16 shrink-0" />
              <div className="flex-1 flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-3.5 w-14" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-brand-border rounded-2xl p-5 sm:p-6">
            <Skeleton className="h-3 w-24 mb-4" />
            <Skeleton className="h-3.5 w-32 mb-2" />
            <Skeleton className="h-3.5 w-24" />
          </div>
        ))}
      </div>

      <div className="border-t pt-4 flex flex-col gap-3" style={{ borderColor: 'var(--color-brand-border)' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

function AddressBlock({ address }: { address: OrderAddress }) {
  return (
    <div className="text-body-sm">
      <p className="font-semibold text-brand-forest">{address.fullName}</p>
      <p className="text-brand-muted mt-1">
        {address.line1}{address.line2 ? `, ${address.line2}` : ''}, {address.city}, {address.state} {address.pincode}
      </p>
      <p className="text-brand-muted mt-1">{address.phone}</p>
    </div>
  )
}

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
      .catch((err) => setError(getErrorMessage(err, 'Failed to load order')))
      .finally(() => setLoading(false))
  }, [token, params.id])

  if (!token) {
    return (
      <div className="container-brand section-py text-center">
        <p className="text-display-md font-display mb-4">SIGN IN TO VIEW THIS ORDER</p>
        <Link href="/account" className="inline-flex items-center justify-center h-11 px-6 text-xs font-semibold uppercase tracking-widest bg-brand-forest text-white rounded-sm transition-colors hover:bg-brand-sage hover:text-brand-forest">
          Sign In
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link href="/account/orders" className="text-body-sm mb-6 inline-block" style={{ color: 'var(--color-brand-muted)' }}>
        ← Back to orders
      </Link>

      {isLoading && <OrderDetailSkeleton />}

      {!isLoading && error && (
        <p className="text-body-sm p-3 rounded-sm" style={{ background: '#FEE2E2', color: '#B91C1C' }}>{error}</p>
      )}

      {!isLoading && !error && order && (
        <div className="flex flex-col gap-8 animate-fade-in">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-display-lg font-display text-brand-forest">{order.orderNumber}</h1>
              <p className="text-body-xs text-brand-muted mt-1">
                Placed on {formatDateTime(order.placedAt ?? order.createdAt)}
              </p>
            </div>
            <span
              className="text-body-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-sm"
              style={{ color: STATUS_COLORS[order.status] ?? '#6B7280', background: `${STATUS_COLORS[order.status] ?? '#6B7280'}1A` }}
            >
              {order.status}
            </span>
          </div>

          {order.cancelledReason && (
            <p className="text-body-sm p-3 rounded-sm" style={{ background: '#FEE2E2', color: '#B91C1C' }}>
              Order cancelled{order.cancelledAt ? ` on ${formatDateTime(order.cancelledAt)}` : ''}: {order.cancelledReason}
            </p>
          )}

          {/* Timeline */}
          {order.timeline.length > 0 && (
            <div className="border border-brand-border rounded-2xl p-5 sm:p-6">
              <p className="text-label text-brand-muted mb-4">Order Progress</p>
              <div className="flex flex-col gap-4">
                {order.timeline.map((event, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span
                      className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                      style={{ background: STATUS_COLORS[event.status] ?? '#6B7280' }}
                    />
                    <div>
                      <p className="text-body-sm font-semibold text-brand-forest capitalize">{event.status}</p>
                      <p className="text-body-xs text-brand-muted">{formatDateTime(event.at)}</p>
                      {event.note && <p className="text-body-xs text-brand-muted mt-0.5">{event.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Items */}
          <div>
            <p className="text-label text-brand-muted mb-4">Items</p>
            <div className="flex flex-col gap-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4">
                  {item.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-sm" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm font-semibold truncate">{item.name}</p>
                    <p className="text-body-xs text-brand-muted">Qty {item.quantity}</p>
                  </div>
                  <p className="text-body-sm">{formatPrice(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Address / delivery / payment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-brand-border rounded-2xl p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin size={16} className="text-brand-teal" />
                <p className="text-label text-brand-muted">Shipping Address</p>
              </div>
              <AddressBlock address={order.shippingAddress} />
            </div>

            {order.billingAddress && !addressesMatch(order.shippingAddress, order.billingAddress) && (
              <div className="border border-brand-border rounded-2xl p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin size={16} className="text-brand-teal" />
                  <p className="text-label text-brand-muted">Billing Address</p>
                </div>
                <AddressBlock address={order.billingAddress} />
              </div>
            )}

            <div className="border border-brand-border rounded-2xl p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Truck size={16} className="text-brand-teal" />
                <p className="text-label text-brand-muted">Delivery</p>
              </div>
              {order.carrier && (
                <p className="text-body-sm text-brand-forest mb-1">
                  Carrier: <span className="font-semibold">{order.carrier}</span>
                </p>
              )}
              {order.trackingNumber && (
                <p className="text-body-sm text-brand-forest mb-1">
                  Tracking No: <span className="font-semibold">{order.trackingNumber}</span>
                </p>
              )}
              {order.trackingUrl && (
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-body-sm text-brand-teal underline mt-1 inline-block"
                >
                  Track Package
                </a>
              )}
              {order.shippedAt && (
                <p className="text-body-xs text-brand-muted mt-2">Shipped {formatDateTime(order.shippedAt)}</p>
              )}
              {order.deliveredAt && (
                <p className="text-body-xs text-brand-muted mt-1">Delivered {formatDateTime(order.deliveredAt)}</p>
              )}
              {!order.carrier && !order.trackingNumber && !order.shippedAt && (
                <p className="text-body-sm text-brand-muted">Tracking details will appear here once your order ships.</p>
              )}
            </div>

            <div className="border border-brand-border rounded-2xl p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard size={16} className="text-brand-teal" />
                <p className="text-label text-brand-muted">Payment</p>
              </div>
              <p className="text-body-sm text-brand-forest mb-1">
                Method: <span className="font-semibold">{PAYMENT_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}</span>
              </p>
              <p className="text-body-sm text-brand-forest mb-1">
                Status: <span className="font-semibold">{PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus}</span>
              </p>
              {order.razorpayPaymentId && (
                <p className="text-body-xs text-brand-muted mt-2">Transaction ID: {order.razorpayPaymentId}</p>
              )}
            </div>
          </div>

          {order.notes && (
            <div>
              <p className="text-label text-brand-muted mb-2">Order Notes</p>
              <p className="text-body-sm text-brand-muted">{order.notes}</p>
            </div>
          )}

          {/* Totals */}
          <div className="border-t pt-4 flex flex-col gap-2" style={{ borderColor: 'var(--color-brand-border)' }}>
            <div className="flex justify-between text-body-sm">
              <span style={{ color: 'var(--color-brand-muted)' }}>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.discountTotal > 0 && (
              <div className="flex justify-between text-body-sm">
                <span style={{ color: 'var(--color-brand-muted)' }}>Discount</span>
                <span>-{formatPrice(order.discountTotal)}</span>
              </div>
            )}
            {order.taxTotal > 0 && (
              <div className="flex justify-between text-body-sm">
                <span style={{ color: 'var(--color-brand-muted)' }}>Tax</span>
                <span>{formatPrice(order.taxTotal)}</span>
              </div>
            )}
            <div className="flex justify-between text-body-sm">
              <span style={{ color: 'var(--color-brand-muted)' }}>Shipping</span>
              <span>{order.shipping > 0 ? formatPrice(order.shipping) : 'Free'}</span>
            </div>
            <div className="flex justify-between text-body-md font-semibold">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
