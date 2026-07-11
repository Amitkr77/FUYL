import Link from 'next/link'
import { ArrowLeft, Package, Truck, MapPin, User, ClipboardList, CheckCircle2 } from 'lucide-react'
import { getAdminOrder } from '@/lib/orders'
import { OrderStatusPanel } from '@/components/orders/OrderStatusPanel'
import { formatCurrency, formatDate } from '@/lib/utils'

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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/orders" className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-slate-900">{order.orderNumber}</h2>
          <p className="text-sm text-slate-500 mt-0.5">Placed on {formatDate(order.date)}</p>
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
              <div className="flex justify-between text-sm text-slate-500">
                <span>Shipping</span>
                <span>{order.shippingTotal === 0 ? <span className="text-emerald-600">Free</span> : formatCurrency(order.shippingTotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>Tax</span>
                <span>{formatCurrency(order.taxTotal)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-100">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Customer + Address + Timeline */}
        <div className="space-y-5">
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
            <Link href={`/customers/${order.customerId}`} className="text-xs text-[#558476] hover:underline">
              View customer profile →
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
                      <p className="text-xs text-slate-400">{formatDate(event.at)}{event.note ? ` — ${event.note}` : ''}</p>
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
