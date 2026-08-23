'use client'

import { useState, useMemo } from 'react'
import { Search, AlertTriangle } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Subscription, SubscriptionStatus } from '@/lib/subscriptions'

const STATUS_VARIANT: Record<SubscriptionStatus, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  active: 'success', paused: 'warning', past_due: 'danger', cancelled: 'default', expired: 'default', pending: 'info',
}

const PAGE_SIZE = 10

export function SubscriptionsTable({ subscriptions }: { subscriptions: Subscription[] }) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    let rows = term
      ? subscriptions.filter((s) =>
          s.productName.toLowerCase().includes(term) ||
          s.status.toLowerCase().includes(term)
        )
      : subscriptions
    return [...rows].sort((a, b) => {
      if (sort === 'oldest')   return new Date(a.nextDeliveryDate).getTime() - new Date(b.nextDeliveryDate).getTime()
      if (sort === 'price-hi') return b.finalPrice - a.finalPrice
      if (sort === 'price-lo') return a.finalPrice - b.finalPrice
      if (sort === 'status')   return a.status.localeCompare(b.status)
      return new Date(b.nextDeliveryDate).getTime() - new Date(a.nextDeliveryDate).getTime()
    })
  }, [subscriptions, search, sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const curPage   = Math.min(page, pageCount)
  const paged     = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE)

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="p-4 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by product or status..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent"
            />
          </div>
          <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1) }}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-600">
            <option value="newest">Newest delivery</option>
            <option value="oldest">Oldest delivery</option>
            <option value="price-hi">Price: High → Low</option>
            <option value="price-lo">Price: Low → High</option>
            <option value="status">Status A → Z</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Product</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Price</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Interval</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Cycles</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Next Delivery</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paged.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-sm">No subscriptions found.</td></tr>
            ) : (
              paged.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      {s.consecutiveFailures > 0 && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                      <span className="text-sm font-medium text-slate-900">{s.productName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4"><Badge variant={STATUS_VARIANT[s.status]}>{s.status.replace('_', ' ')}</Badge></td>
                  <td className="px-5 py-4 text-sm font-semibold text-slate-900">{formatCurrency(s.finalPrice)}</td>
                  <td className="px-5 py-4 text-sm text-slate-500 hidden md:table-cell capitalize">
                    every {s.intervalCount > 1 ? `${s.intervalCount} ` : ''}{s.interval}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500 hidden lg:table-cell">{s.totalCyclesExecuted}</td>
                  <td className="px-5 py-4 text-sm text-slate-500">{formatDate(s.nextDeliveryDate)}</td>
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
