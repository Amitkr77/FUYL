import Link from 'next/link'
import { ArrowRight, Package, Truck, MapPin, User, ClipboardList, CheckCircle2, CreditCard } from 'lucide-react'
import { getAdminOrder } from '@/lib/orders'
import { OrderStatusPanel } from '@/components/orders/OrderStatusPanel'
import { BookShipmentPanel } from '@/components/shipping/BookShipmentPanel'
import { formatCurrency, formatDateTime } from '@/lib/utils'

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cashfree: 'Card / UPI / Netbanking',
  razorpay: 'Card / UPI / Netbanking',
  upi: 'UPI',
  cod: 'Cash on Delivery',
  wallet: 'Wallet',
  loyalty: 'Loyalty Points',
  split: 'Split Payment',
}
const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  success: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
  partially_refunded: 'Partially Refunded',
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = await getAdminOrder(id)

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-2xl font-bold text-slate-900 mb-2">Order not found</p>
        <p className="text-slate-500 text-sm">Order &quot;{id}&quot; does not exist.</p>
      </div>
    )
  }

  const capturedExternal = order.payments
    .filter((payment) => ['success', 'refunded', 'partially_refunded'].includes(payment.status) && !['wallet', 'loyalty'].includes(payment.gateway))
    .reduce((sum, payment) => sum + payment.amount, 0)
  const refunded = order.payments.reduce((sum, payment) => sum + payment.refundedAmount, 0)
  const amountDue = Math.max(0, order.total - order.walletApplied - order.loyaltyApplied - capturedExternal)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{order.orderNumber}</h2>
          <p className="text-sm text-slate-500 mt-0.5">Placed on {formatDateTime(order.date)}</p>
        </div>
      </div>

      <OrderStatusPanel order={order} />

      {/* Body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Items + totals */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 p-5 border-b border-slate-100">
              <ClipboardList className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900">Order Items</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-10 h-10 bg-[#558476]/10 rounded-lg flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-[#558476]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
                    <p className="text-xs text-slate-400">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{formatCurrency(item.totalPrice)}</p>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-slate-100 space-y-2">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discountTotal > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(order.discountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-slate-500">
                <span>Shipping</span>
                <span>{order.shippingTotal === 0 ? <span className="text-emerald-600">Free</span> : formatCurrency(order.shippingTotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>Tax</span>
                <span>{formatCurrency(order.taxTotal)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-100">
                <span>Order total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900">Payment</h3>
            </div>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-slate-500">Method</span>
              <span className="text-slate-900 font-medium text-right">{PAYMENT_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}</span>
              <span className="text-slate-500">Status</span>
              <span className="text-slate-900 font-medium text-right">{PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus}</span>
              {capturedExternal > 0 && <><span className="text-slate-500">Online payment</span>
              <span className="text-slate-900 font-medium text-right">{formatCurrency(capturedExternal)}</span></>}
              {order.walletApplied > 0 && <><span className="text-slate-500">Wallet used</span>
              <span className="text-slate-900 font-medium text-right">{formatCurrency(order.walletApplied)}</span></>}
              {order.loyaltyApplied > 0 && <><span className="text-slate-500">Loyalty used</span>
              <span className="text-slate-900 font-medium text-right">{formatCurrency(order.loyaltyApplied)}</span></>}
              <span className="text-slate-500 font-semibold pt-1 border-t border-slate-100">Total paid</span>
              <span className="text-slate-900 font-bold text-right pt-1 border-t border-slate-100">{formatCurrency(capturedExternal + order.walletApplied + order.loyaltyApplied)}</span>
              {amountDue > 0 && <><span className="text-amber-600 font-semibold">Amount due</span>
              <span className="text-amber-600 font-bold text-right">{formatCurrency(amountDue)}</span></>}
              {refunded > 0 && <><span className="text-slate-500">Refunded</span><span className="text-rose-600 font-medium text-right">{formatCurrency(refunded)}</span></>}
            </div>
            {order.payments.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                {order.payments.map((p, i) => (
                  <p key={i} className="text-xs text-slate-500">
                    <span className="capitalize">{p.gateway}</span> · {formatCurrency(p.amount)} · <span className="capitalize">{p.status}</span>
                    {p.reference ? ` · Ref: ${p.reference}` : ''}
                    {p.capturedAt ? ` · ${formatDateTime(p.capturedAt)}` : ''}
                    {p.refundedAmount > 0 ? ` · Refunded ${formatCurrency(p.refundedAmount)}` : ''}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Customer + Address + Timeline */}
        <div className="space-y-5">
          {/* Book shipment — only renders for confirmed/packed orders */}
          <BookShipmentPanel orderId={order.id} orderStatus={order.status} />

          {/* Customer — name/phone is what the order itself captured at
              checkout (shippingAddress), not a live-linked field on the
              order; the profile link below does resolve to a real user now
              that /admin/customers exists. */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900">Customer</h3>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#558476] flex items-center justify-center shrink-0">
                <span className="text-white text-sm font-bold">{order.customerName.charAt(0)}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{order.customerName}</p>
                <p className="text-xs text-slate-400">{order.phone}</p>
              </div>
            </div>
            <Link href={`/customers/${order.customerId}`} className="inline-flex items-center gap-1 text-xs text-[#558476] hover:underline">
              View customer profile <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Shipping address */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900">Shipping Address</h3>
            </div>
            <div className="text-sm text-slate-600 space-y-1">
              <p className="font-medium text-slate-900">{order.address.fullName}</p>
              <p>{order.address.line1}</p>
              {order.address.line2 && <p>{order.address.line2}</p>}
              <p>{order.address.city}, {order.address.state}</p>
              <p>{order.address.pincode}, {order.address.country}</p>
            </div>
            {order.trackingNumber && (
              <div className="mt-3 pt-3 border-t border-slate-100 text-sm">
                <p className="text-slate-500">Tracking</p>
                <p className="font-medium text-slate-900">
                  {order.carrier ? `${order.carrier} — ` : ''}{order.trackingNumber}
                </p>
              </div>
            )}
          </div>

          {/* Delivery timeline — real status-change audit log */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900">Timeline</h3>
            </div>
            {order.timeline.length === 0 ? (
              <p className="text-xs text-slate-400">No status changes recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {order.timeline.map((event, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-[#558476]">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 capitalize">{event.status}</p>
                      <p className="text-xs text-slate-400">{formatDateTime(event.at)}{event.note ? ` — ${event.note}` : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
