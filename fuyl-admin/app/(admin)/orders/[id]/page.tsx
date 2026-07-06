'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Package, Truck, MapPin, User, ClipboardList } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import {
  getOrderById,
  getOrderLineItems,
  getOrderAddress,
  OrderStatus,
} from '@/lib/mock-data'
import { formatCurrency, formatDate } from '@/lib/utils'

const STATUS_FLOW: OrderStatus[] = ['pending', 'processing', 'shipped', 'delivered']

const statusVariant = (s: OrderStatus): 'success' | 'warning' | 'danger' | 'info' | 'default' => {
  const map: Record<OrderStatus, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
    delivered: 'success',
    shipped: 'info',
    processing: 'warning',
    pending: 'default',
    cancelled: 'danger',
  }
  return map[s]
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const order = getOrderById(id)

  const [status, setStatus] = useState<OrderStatus | null>(null)
  const [saved, setSaved] = useState(false)

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-2xl font-bold text-slate-900 mb-2">Order not found</p>
        <p className="text-slate-500 text-sm">Order &quot;{id}&quot; does not exist.</p>
      </div>
    )
  }

  const currentStatus = status ?? order.status
  const lineItems = getOrderLineItems(order)
  const address = getOrderAddress(order)
  const subtotal = lineItems.reduce((s, i) => s + i.price * i.qty, 0)
  const shipping = 0
  const tax = Math.round(subtotal * 0.05)

  const handleUpdateStatus = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/orders"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900">{order.id}</h2>
              <Badge variant={statusVariant(currentStatus)}>
                {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">Placed on {formatDate(order.date)}</p>
          </div>
        </div>

        {/* Status update */}
        <div className="flex items-center gap-2">
          <select
            value={currentStatus}
            onChange={(e) => setStatus(e.target.value as OrderStatus)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#558476]"
          >
            {(['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as OrderStatus[]).map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
          <button
            onClick={handleUpdateStatus}
            className="flex items-center gap-2 px-4 py-2 bg-[#558476] hover:bg-[#457366] text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saved ? <CheckCircle2 className="w-4 h-4" /> : null}
            {saved ? 'Updated!' : 'Update Status'}
          </button>
        </div>
      </div>

      {/* Order progress bar */}
      {currentStatus !== 'cancelled' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 right-0 top-4 h-0.5 bg-slate-100 mx-8" />
            <div
              className="absolute left-0 top-4 h-0.5 bg-[#558476] mx-8 transition-all duration-500"
              style={{
                width: `${(STATUS_FLOW.indexOf(currentStatus) / (STATUS_FLOW.length - 1)) * 100}%`,
              }}
            />
            {STATUS_FLOW.map((s, i) => {
              const done = STATUS_FLOW.indexOf(currentStatus) >= i
              return (
                <div key={s} className="flex flex-col items-center gap-2 relative z-10">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                      done
                        ? 'bg-[#558476] border-[#558476] text-white'
                        : 'bg-white border-slate-200 text-slate-300'
                    }`}
                  >
                    {done ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs">{i + 1}</span>}
                  </div>
                  <span className={`text-xs font-medium capitalize hidden sm:block ${done ? 'text-[#558476]' : 'text-slate-400'}`}>
                    {s}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Items + totals */}
        <div className="lg:col-span-2 space-y-5">
          {/* Line items */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 p-5 border-b border-slate-100">
              <ClipboardList className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900">Order Items</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {lineItems.map((item, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-10 h-10 bg-[#558476]/10 rounded-lg flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-[#558476]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
                    <p className="text-xs text-slate-400">Qty: {item.qty}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{formatCurrency(item.price * item.qty)}</p>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-slate-100 space-y-2">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>Shipping</span>
                <span className="text-emerald-600">Free</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>GST (5%)</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-100">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Customer + Address */}
        <div className="space-y-5">
          {/* Customer */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900">Customer</h3>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#558476] flex items-center justify-center shrink-0">
                <span className="text-white text-sm font-bold">{order.customer.charAt(0)}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{order.customer}</p>
                <p className="text-xs text-slate-400">{order.email}</p>
              </div>
            </div>
            <Link
              href={`/customers/${order.email.split('@')[0].replace('.', '-')}`}
              className="text-xs text-[#558476] hover:underline"
            >
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
              <p className="font-medium text-slate-900">{order.customer}</p>
              <p>{address.street}</p>
              <p>{address.city}, {address.state}</p>
              <p>{address.pincode}</p>
            </div>
          </div>

          {/* Delivery timeline */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900">Delivery Timeline</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Order placed', time: formatDate(order.date), done: true },
                {
                  label: 'Payment confirmed',
                  time: formatDate(order.date),
                  done: currentStatus !== 'pending',
                },
                {
                  label: 'Dispatched',
                  time: currentStatus === 'shipped' || currentStatus === 'delivered' ? 'Shipped' : '—',
                  done: currentStatus === 'shipped' || currentStatus === 'delivered',
                },
                {
                  label: 'Delivered',
                  time: currentStatus === 'delivered' ? 'Delivered' : 'Expected in 3-5 days',
                  done: currentStatus === 'delivered',
                },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      step.done ? 'bg-[#558476]' : 'bg-slate-100'
                    }`}
                  >
                    {step.done && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${step.done ? 'text-slate-900' : 'text-slate-400'}`}>
                      {step.label}
                    </p>
                    <p className="text-xs text-slate-400">{step.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
