'use client'

import { useMemo, useState, useTransition } from 'react'
import { Search, X } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { ReturnRequest, ReturnStatus } from '@/lib/returns'
import { updateReturnStatusAction } from '@/app/(admin)/returns/actions'
import { Pagination } from '@/components/ui/Pagination'

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

type TabFilter = 'all' | ReturnStatus
const STATUS_TABS: { label: string; value: TabFilter }[] = [
  { label: 'All',       value: 'all' },
  { label: 'Requested', value: 'requested' },
  { label: 'Approved',  value: 'approved' },
  { label: 'Rejected',  value: 'rejected' },
  { label: 'Scheduled', value: 'pickup_scheduled' },
  { label: 'Received',  value: 'received' },
  { label: 'Refunded',  value: 'refunded' },
  { label: 'Cancelled', value: 'cancelled' },
]

const PAGE_SIZE = 10

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
  const [tab, setTab]       = useState<TabFilter>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort]     = useState('newest')
  const [page, setPage]     = useState(1)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    let rows = tab === 'all' ? returns : returns.filter((r) => r.status === tab)
    if (term) rows = rows.filter((r) =>
      r.returnNumber.toLowerCase().includes(term) ||
      r.reason.toLowerCase().includes(term)
    )
    return [...rows].sort((a, b) => {
      if (sort === 'oldest')  return new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime()
      if (sort === 'highest') return b.refundAmount - a.refundAmount
      if (sort === 'lowest')  return a.refundAmount - b.refundAmount
      return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    })
  }, [returns, tab, search, sort])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const curPage   = Math.min(page, pageCount)
  const paged     = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE)
  const tabCount  = (v: TabFilter) => v === 'all' ? returns.length : returns.filter((r) => r.status === v).length

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      {/* Status tabs */}
      <div className="flex items-center gap-1 px-4 pt-3 border-b border-slate-100 overflow-x-auto scrollbar-hide">
        {STATUS_TABS.map((t) => (
          <button key={t.value} onClick={() => { setTab(t.value); setPage(1) }}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px ${
              tab === t.value ? 'border-[#558476] text-[#558476]' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.value ? 'bg-[#558476]/10 text-[#558476]' : 'bg-slate-100 text-slate-400'}`}>
              {tabCount(t.value)}
            </span>
          </button>
        ))}
      </div>

      {/* Search + sort toolbar */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input placeholder="Search return # or reason…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#558476]/30" />
          {search && <button onClick={() => { setSearch(''); setPage(1) }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
          <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1) }}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-600">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest">Highest refund</option>
            <option value="lowest">Lowest refund</option>
          </select>
        </div>
      </div>

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
            {paged.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-sm">No returns match.</td></tr>
            ) : (
              paged.map((r) => (
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
      <Pagination page={curPage} pageCount={pageCount} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
    </div>
  )
}
