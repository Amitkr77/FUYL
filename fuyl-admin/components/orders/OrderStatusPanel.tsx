'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, AlertCircle, Circle } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import type { AdminOrderDetail } from '@/lib/orders'
import { type OrderStatus, MANUAL_STATUS_OPTIONS, STATUS_FLOW, ORDER_STATUS_LABEL } from '@/lib/orderStatus'
import { updateOrderStatusAction } from '@/app/(admin)/orders/actions'

const statusVariant = (s: OrderStatus): 'success' | 'warning' | 'danger' | 'info' | 'default' => {
  const map: Record<OrderStatus, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
    completed: 'success',  delivered: 'success',
    dispatched: 'info',    in_transit: 'info',  shipped: 'info', confirmed: 'info',
    packed: 'warning',     pending: 'default',
    cancelled: 'danger',   returned: 'danger',
  }
  return map[s] ?? 'default'
}

export function OrderStatusPanel({ order }: { order: AdminOrderDetail }) {
  const [status, setStatus] = useState<OrderStatus>(order.status)
  const [note, setNote] = useState('')
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber ?? '')
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const isTerminal = order.status === 'cancelled' || order.status === 'completed'

  const hasChanges =
    status !== order.status ||
    note.trim().length > 0 ||
    trackingNumber !== (order.trackingNumber ?? '')

  const handleUpdate = () => {
    setError('')
    startTransition(async () => {
      const result = await updateOrderStatusAction(order.id, { status, note, trackingNumber })
      if ('error' in result) { setError(result.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  // Find where the current order status sits in the customer-facing flow
  const flowIdx = STATUS_FLOW.indexOf(
    // Map legacy/extra statuses to their nearest flow step
    order.status === 'shipped' ? 'dispatched'
    : order.status === 'packed' ? 'confirmed'
    : order.status
  )

  return (
    <>
      {/* Header: current badge + controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Badge variant={statusVariant(order.status)}>
            {ORDER_STATUS_LABEL[order.status] ?? order.status}
          </Badge>
        </div>

        {isTerminal ? (
          <p className="text-sm text-slate-400">
            Order is {ORDER_STATUS_LABEL[order.status]} — status can no longer be changed.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Tracking number (optional)"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#558476] w-44"
            />
            <input
              type="text"
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#558476] w-40"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#558476]"
            >
              {MANUAL_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleUpdate}
              disabled={isPending || !hasChanges}
              className="flex items-center gap-2 px-4 py-2 bg-[#558476] hover:bg-[#457366] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {saved ? <CheckCircle2 className="w-4 h-4" /> : null}
              {saved ? 'Updated!' : isPending ? 'Updating…' : 'Update Status'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Customer-facing progress: Confirmed → Dispatched → In Transit → Delivered */}
      {order.status !== 'cancelled' && order.status !== 'returned' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between relative">
            {/* Track line */}
            <div className="absolute left-0 right-0 top-4 h-0.5 bg-slate-100 mx-8" />
            <div
              className="absolute left-0 top-4 h-0.5 bg-[#558476] mx-8 transition-all duration-500"
              style={{ width: flowIdx >= 0 ? `${(flowIdx / (STATUS_FLOW.length - 1)) * 100}%` : '0%' }}
            />
            {STATUS_FLOW.map((s, i) => {
              const done = flowIdx >= i
              return (
                <div key={s} className="flex flex-col items-center gap-2 relative z-10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                    done ? 'bg-[#558476] border-[#558476] text-white' : 'bg-white border-slate-200 text-slate-300'
                  }`}>
                    {done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block text-center ${done ? 'text-[#558476]' : 'text-slate-400'}`}>
                    {ORDER_STATUS_LABEL[s]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
