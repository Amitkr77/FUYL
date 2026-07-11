'use client'

import { useState, useTransition } from 'react'
import { Search, ExternalLink } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import type { Shipment, ShipmentStatus } from '@/lib/shipping'
import { updateShipmentStatusAction } from '@/app/(admin)/shipping/actions'

const STATUS_VARIANT: Record<ShipmentStatus, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  pending: 'default', label_created: 'info', picked_up: 'info', in_transit: 'info',
  out_for_delivery: 'warning', delivered: 'success', failed: 'danger',
  returned_to_origin: 'danger', cancelled: 'default',
}

// Mirrors shipping.service.ts's ALLOWED_TRANSITIONS on the backend — the
// single "next step" available from each status, so the admin can't fire
// an illegal transition (the backend would reject it anyway, but surfacing
// only the valid next action is clearer than a free dropdown + an error).
const NEXT_ACTION: Partial<Record<ShipmentStatus, { label: string; next: ShipmentStatus }>> = {
  label_created: { label: 'Mark Picked Up', next: 'picked_up' },
  picked_up: { label: 'Mark In Transit', next: 'in_transit' },
  in_transit: { label: 'Out for Delivery', next: 'out_for_delivery' },
  out_for_delivery: { label: 'Mark Delivered', next: 'delivered' },
}

function RowActions({ s }: { s: Shipment }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const action = NEXT_ACTION[s.status]

  const run = (status: ShipmentStatus) => {
    setError('')
    startTransition(async () => {
      const result = await updateShipmentStatusAction(s.id, status)
      if ('error' in result) setError(result.error)
    })
  }

  return (
    <div className="flex items-center gap-2">
      {action && (
        <button
          onClick={() => run(action.next)}
          disabled={isPending}
          className="px-3 py-1.5 text-xs font-medium text-white bg-[#558476] hover:bg-[#457366] rounded-lg transition-colors disabled:opacity-50"
        >
          {isPending ? 'Saving…' : action.label}
        </button>
      )}
      {['picked_up', 'in_transit', 'out_for_delivery'].includes(s.status) && (
        <button
          onClick={() => run('failed')}
          disabled={isPending}
          className="px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          Mark Failed
        </button>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

export function ShipmentsTable({ shipments }: { shipments: Shipment[] }) {
  const [search, setSearch] = useState('')

  const filtered = shipments.filter((s) =>
    !search ||
    s.trackingNumber.toLowerCase().includes(search.toLowerCase()) ||
    s.recipientName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="p-4 border-b border-slate-100">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by tracking # or recipient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Shipment</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Recipient</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Carrier</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Booked</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-sm">No shipments found.</td></tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-slate-900">{s.shipmentNumber}</p>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      {s.trackingNumber}
                      {s.trackingUrl && (
                        <a href={s.trackingUrl} target="_blank" rel="noreferrer" className="text-[#558476]">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500 hidden md:table-cell">
                    <p>{s.recipientName}</p>
                    <p className="text-xs">{s.destination}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500 hidden lg:table-cell">{s.carrier}</td>
                  <td className="px-5 py-4"><Badge variant={STATUS_VARIANT[s.status]}>{s.status.replace(/_/g, ' ')}</Badge></td>
                  <td className="px-5 py-4 text-sm text-slate-500 hidden lg:table-cell">{formatDate(s.createdAt)}</td>
                  <td className="px-5 py-4"><RowActions s={s} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
