'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Truck, CreditCard, ClipboardList, ArrowLeft, Package, XCircle } from 'lucide-react'
import { useAuthStore } from '@/lib/store/authStore'
import { formatPrice } from '@/lib/utils/formatPrice'
import { getOrder } from '@/lib/api/account'
import { getOrderPayments, type OrderPayment } from '@/lib/api/payment'
import { CancelOrderPanel } from '@/components/orders/CancelOrderPanel'
import { RefundRequestPanel } from '@/components/orders/RefundRequestPanel'
import { OrderStatusBadge, ORDER_STATUS_META } from '@/components/orders/OrderStatusBadge'
import { OrderProgress } from '@/components/orders/OrderProgress'
import { Skeleton } from '@/components/ui/Skeleton'
import { WriteReviewForm } from '@/components/product/WriteReviewForm'
import type { Order, OrderAddress } from '@/types/user'
import { getErrorMessage } from '@/lib/api/client'

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cashfree: 'Card / UPI / Netbanking',
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

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-brand-border p-5 sm:p-6 ${className}`}>
      {children}
    </div>
  )
}

function CardHeading({ icon: Icon, children }: { icon: typeof MapPin; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={16} className="text-brand-teal" />
      <p className="text-label text-brand-muted">{children}</p>
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

function OrderDetailSkeleton() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading order">
      <div className="flex items-start justify-between gap-3 mb-8">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-36 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  )
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>()
  const { token, user } = useAuthStore()
  const [order, setOrder] = useState<Order | null>(null)
  const [payments, setPayments] = useState<OrderPayment[]>([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviewingItemId, setReviewingItemId] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!token || !params.id) return
    setLoading(true)
    // Payment records carry the gateway amount/reference/date — non-fatal if
    // they can't be loaded (the order's own method/status still render).
    getOrderPayments(token, params.id).then(setPayments).catch(() => {})
    getOrder(token, params.id)
      .then(setOrder)
      .catch((err) => setError(getErrorMessage(err, 'Failed to load order')))
      .finally(() => setLoading(false))
  }, [token, params.id, reloadKey])

  if (!user) {
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
      <Link href="/account/orders" className="inline-flex items-center gap-1.5 text-body-sm mb-6 text-brand-muted hover:text-brand-forest transition-colors">
        <ArrowLeft size={15} /> Back to orders
      </Link>

      {isLoading && <OrderDetailSkeleton />}

      {!isLoading && error && (
        <p className="text-body-sm p-3 rounded-sm" style={{ background: '#FEE2E2', color: '#B91C1C' }}>{error}</p>
      )}

      {!isLoading && !error && order && (
        <div className="animate-fade-in">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
            <div>
              <h1 className="text-display-lg font-display text-brand-forest">{order.orderNumber}</h1>
              <p className="text-body-xs text-brand-muted mt-1">
                Placed on {formatDateTime(order.placedAt ?? order.createdAt)}
              </p>
            </div>
            <OrderStatusBadge status={order.status} size="md" />
          </div>

          {/* Cancelled / returned banner */}
          {(order.status === 'cancelled' || order.status === 'returned') && (
            <div className="flex items-start gap-2.5 p-4 rounded-2xl mb-8" style={{ background: '#FEE2E2' }}>
              <XCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
              <div className="text-body-sm text-red-700">
                <p className="font-semibold capitalize">Order {order.status}</p>
                {order.cancelledReason && (
                  <p className="mt-0.5">
                    {order.cancelledAt ? `${formatDateTime(order.cancelledAt)} — ` : ''}{order.cancelledReason}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* ─── Main column ─── */}
            <div className="lg:col-span-2 space-y-6">
              {/* Progress tracker */}
              {order.status !== 'cancelled' && order.status !== 'returned' && (
                <Card>
                  <OrderProgress status={order.status} />
                </Card>
              )}

              {/* Actions */}
              {token && ['pending', 'confirmed', 'packed'].includes(order.status) && (
                <CancelOrderPanel token={token} orderId={order.id} onDone={() => setReloadKey((k) => k + 1)} />
              )}
              {token && ['delivered', 'completed'].includes(order.status) && (
                <RefundRequestPanel token={token} orderId={order.id} items={order.items} onDone={() => setReloadKey((k) => k + 1)} />
              )}

              {/* Items */}
              <Card>
                <CardHeading icon={Package}>Items ({order.items.length})</CardHeading>
                <div className="flex flex-col divide-y divide-brand-border/60">
                  {order.items.map((item) => {
                    const canReview = order.status === 'delivered' || order.status === 'completed'
                    const isReviewing = reviewingItemId === item.id
                    return (
                      <div key={item.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-4">
                          {item.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-lg shrink-0" />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-brand-sage/40 flex items-center justify-center shrink-0">
                              <Package size={20} className="text-brand-forest/50" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-body-sm font-semibold text-brand-forest truncate">{item.name}</p>
                            <p className="text-body-xs text-brand-muted mt-0.5">Qty {item.quantity}</p>
                            {canReview && !isReviewing && (
                              <button
                                type="button"
                                onClick={() => setReviewingItemId(item.id)}
                                className="text-body-xs font-semibold text-brand-teal hover:underline mt-1.5"
                              >
                                Write a review
                              </button>
                            )}
                          </div>
                          <p className="text-body-sm font-medium text-brand-forest">{formatPrice(item.price * item.quantity)}</p>
                        </div>
                        {isReviewing && (
                          <WriteReviewForm
                            productId={item.productId}
                            variantId={item.variantId}
                            orderId={order.id}
                            onCancel={() => setReviewingItemId(null)}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </Card>

              {/* Delivery */}
              <Card>
                <CardHeading icon={Truck}>Delivery</CardHeading>
                {order.carrier && (
                  <p className="text-body-sm text-brand-forest mb-1">Carrier: <span className="font-semibold">{order.carrier}</span></p>
                )}
                {order.trackingNumber && (
                  <p className="text-body-sm text-brand-forest mb-1">Tracking No: <span className="font-semibold">{order.trackingNumber}</span></p>
                )}
                {order.trackingUrl && (
                  <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-body-sm text-brand-teal font-semibold hover:underline mt-1 inline-block">
                    Track package →
                  </a>
                )}
                {order.shippedAt && <p className="text-body-xs text-brand-muted mt-2">Shipped {formatDateTime(order.shippedAt)}</p>}
                {order.deliveredAt && <p className="text-body-xs text-brand-muted mt-1">Delivered {formatDateTime(order.deliveredAt)}</p>}
                {!order.carrier && !order.trackingNumber && !order.shippedAt && (
                  <p className="text-body-sm text-brand-muted">Tracking details will appear here once your order ships.</p>
                )}
              </Card>

              {/* Addresses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Card>
                  <CardHeading icon={MapPin}>Shipping Address</CardHeading>
                  <AddressBlock address={order.shippingAddress} />
                </Card>
                {order.billingAddress && !addressesMatch(order.shippingAddress, order.billingAddress) && (
                  <Card>
                    <CardHeading icon={MapPin}>Billing Address</CardHeading>
                    <AddressBlock address={order.billingAddress} />
                  </Card>
                )}
              </div>

              {order.notes && (
                <Card>
                  <CardHeading icon={ClipboardList}>Order Notes</CardHeading>
                  <p className="text-body-sm text-brand-muted">{order.notes}</p>
                </Card>
              )}

              {/* History */}
              {order.timeline.length > 0 && (
                <Card>
                  <CardHeading icon={ClipboardList}>Order History</CardHeading>
                  <div className="flex flex-col gap-4">
                    {order.timeline.map((event, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span
                          className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                          style={{ background: ORDER_STATUS_META[event.status]?.color ?? '#6B7280' }}
                        />
                        <div>
                          <p className="text-body-sm font-semibold text-brand-forest capitalize">{event.status}</p>
                          <p className="text-body-xs text-brand-muted">{formatDateTime(event.at)}</p>
                          {event.note && <p className="text-body-xs text-brand-muted mt-0.5">{event.note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {/* ─── Sidebar ─── */}
            <div className="space-y-6 lg:sticky lg:top-6 h-fit">
              {/* Summary */}
              <Card>
                <p className="text-label text-brand-muted mb-4">Order Summary</p>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-body-sm">
                    <span className="text-brand-muted">Subtotal</span>
                    <span className="text-brand-forest">{formatPrice(order.subtotal)}</span>
                  </div>
                  {order.discountTotal > 0 && (
                    <div className="flex justify-between text-body-sm">
                      <span className="text-brand-muted">Discount</span>
                      <span className="text-brand-forest">-{formatPrice(order.discountTotal)}</span>
                    </div>
                  )}
                  {order.taxTotal > 0 && (
                    <div className="flex justify-between text-body-sm">
                      <span className="text-brand-muted">Tax</span>
                      <span className="text-brand-forest">{formatPrice(order.taxTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-body-sm">
                    <span className="text-brand-muted">Shipping</span>
                    <span className="text-brand-forest">{order.shipping > 0 ? formatPrice(order.shipping) : 'Free'}</span>
                  </div>
                  <div className="flex justify-between text-body-md font-semibold text-brand-forest pt-3 mt-1 border-t border-brand-border">
                    <span>Total</span>
                    <span>{formatPrice(order.total)}</span>
                  </div>
                </div>
              </Card>

              {/* Payment */}
              <Card>
                <CardHeading icon={CreditCard}>Payment</CardHeading>
                <div className="flex flex-col gap-1.5 text-body-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-brand-muted">Method</span>
                    <span className="text-brand-forest font-medium text-right">{PAYMENT_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-brand-muted">Status</span>
                    <span className="text-brand-forest font-medium text-right">{PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-brand-muted">Amount Paid</span>
                    <span className="text-brand-forest font-medium text-right">{formatPrice(payments[0]?.amount ?? order.total)}</span>
                  </div>
                </div>
                {((payments[0]?.reference ?? order.razorpayPaymentId) || payments[0]?.capturedAt || (payments[0]?.refundedAmount ?? 0) > 0) && (
                  <div className="mt-3 pt-3 border-t border-brand-border space-y-1">
                    {(payments[0]?.reference ?? order.razorpayPaymentId) && (
                      <p className="text-body-xs text-brand-muted break-all">Txn ID: {payments[0]?.reference ?? order.razorpayPaymentId}</p>
                    )}
                    {payments[0]?.capturedAt && (
                      <p className="text-body-xs text-brand-muted">Paid on {formatDateTime(payments[0].capturedAt)}</p>
                    )}
                    {payments[0] && payments[0].refundedAmount > 0 && (
                      <p className="text-body-xs text-brand-muted">Refunded: {formatPrice(payments[0].refundedAmount)}</p>
                    )}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
