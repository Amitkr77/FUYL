'use client'

import { useState, useTransition } from 'react'
import Badge from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { ReturnRequest, ReturnStatus } from '@/lib/returns'
import { updateReturnStatusAction } from '@/app/(admin)/returns/actions'

const STATUS_VARIANT: Record<ReturnStatus, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  requested: 'warning', approved: 'info', rejected: 'danger', pickup_scheduled: 'info',
  picked_up: 'info', received: 'info', refunded: 'success', cancelled: 'default',
}

// The next single action available from each status — keeps the admin on
// the real return workflow instead of a free-form dropdown that could set
// an illegal transition (e.g. jumping straight from "requested" to "refunded"
// without ever receiving the item back).
const NEXT_ACTION: Partial<Record<ReturnStatus, { label: string; next: ReturnStatus }>> = {
  approved: { label: 'Schedule Pickup', next: 'pickup_scheduled' },
  pickup_scheduled: { label: 'Mark Picked Up', next: 'picked_up' },
  picked_up: { label: 'Mark Received', next: 'received' },
  received: { label: 'Issue Refund', next: 'refunded' },
}

function RowActions({ r }: { r: ReturnRequest }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const run = (status: ReturnStatus, rejectedReason?: string) => {
    setError('')
    startTransition(async () => {
      const result = await updateReturnStatusAction(r.id, status, rejectedReason)
      if ('error' in result) setError(result.error)
    })
  }

  if (r.status === 'requested') {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => run('approved')}
          disabled={isPending}
          className="px-3 py-1.5 text-xs font-medium text-white bg-[#558476] hover:bg-[#457366] rounded-lg transition-colors disabled:opacity-50"
        >
          Approve
        </button>
        <button
          onClick={() => {
            const reason = prompt('Reason for rejecting this return?')
            if (reason) run('rejected', reason)
          }}
          disabled={isPending}
          className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          Reject
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    )
  }

  const action = NEXT_ACTION[r.status]
  if (!action) return null

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => run(action.next)}
        disabled={isPending}
        className="px-3 py-1.5 text-xs font-medium text-white bg-[#558476] hover:bg-[#457366] rounded-lg transition-colors disabled:opacity-50"
      >
        {isPending ? 'Saving…' : action.label}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

export function ReturnsTable({ returns }: { returns: ReturnRequest[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Return #</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Reason</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Refund</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Requested</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {returns.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-sm">No return requests.</td></tr>
            ) : (
              returns.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-slate-900">{r.returnNumber}</p>
                    <p className="text-xs text-slate-500">{r.itemCount} item{r.itemCount === 1 ? '' : 's'}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500 hidden md:table-cell max-w-xs truncate">{r.reason}</td>
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-slate-900">{formatCurrency(r.refundAmount)}</p>
                    <p className="text-xs text-slate-500 capitalize">{r.refundMethod}</p>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={STATUS_VARIANT[r.status]}>{r.status.replace('_', ' ')}</Badge>
                    {r.status === 'rejected' && r.rejectedReason && (
                      <p className="text-xs text-slate-400 mt-1 max-w-[160px] truncate">{r.rejectedReason}</p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500 hidden lg:table-cell">{formatDate(r.requestedAt)}</td>
                  <td className="px-5 py-4"><RowActions r={r} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
