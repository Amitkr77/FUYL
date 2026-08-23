'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { formatDate } from '@/lib/utils'
import type { Referral, ReferralStatus } from '@/lib/referrals'

const STATUS_VARIANT: Record<ReferralStatus, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  shared: 'default', applied: 'info', pending: 'info', eligible: 'warning',
  rewarded: 'success', completed: 'success', rejected: 'danger',
}

const PAGE_SIZE = 10

type ReferralTabFilter = 'all' | string
const REFERRAL_TABS = [
  { label: 'All',       value: 'all'       },
  { label: 'Shared',    value: 'shared'    },
  { label: 'Applied',   value: 'applied'   },
  { label: 'Rewarded',  value: 'rewarded'  },
  { label: 'Completed', value: 'completed' },
  { label: 'Rejected',  value: 'rejected'  },
]

export function ReferralsTable({ referrals }: { referrals: Referral[] }) {
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<ReferralTabFilter>('all')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    let rows = tab === 'all' ? referrals : referrals.filter((r) => r.status === tab)
    if (term) rows = rows.filter((r) =>
      r.code.toLowerCase().includes(term) ||
      r.referrerId.toLowerCase().includes(term) ||
      r.refereeId.toLowerCase().includes(term)
    )
    return [...rows].sort((a, b) => {
      if (sort === 'oldest') return new Date(a.sharedAt).getTime() - new Date(b.sharedAt).getTime()
      if (sort === 'status') return a.status.localeCompare(b.status)
      return new Date(b.sharedAt).getTime() - new Date(a.sharedAt).getTime()
    })
  }, [referrals, tab, search, sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const curPage   = Math.min(page, pageCount)
  const paged     = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE)
  const tabCount  = (v: string) => v === 'all' ? referrals.length : referrals.filter((r) => r.status === v).length

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      {/* Tab row */}
      <div className="flex items-center gap-1 px-4 pt-3 border-b border-slate-100 overflow-x-auto scrollbar-hide">
        {REFERRAL_TABS.map((t) => (
          <button key={t.value} onClick={() => { setTab(t.value); setPage(1) }}
            className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px ${
              tab === t.value ? 'border-[#558476] text-[#558476]' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            {t.label}{' '}
            <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${tab === t.value ? 'bg-[#558476]/10 text-[#558476]' : 'bg-slate-100 text-slate-400'}`}>
              {tabCount(t.value)}
            </span>
          </button>
        ))}
      </div>

      {/* Search + sort toolbar */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by code, referrer or referee..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent"
            />
          </div>
          <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1) }}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-600">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="status">Status A → Z</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Code</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Referrer</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Referee</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Shared</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paged.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400 text-sm">No referrals found.</td></tr>
            ) : (
              paged.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4 text-sm font-mono font-medium text-slate-900">{r.code}</td>
                  <td className="px-5 py-4 text-sm text-slate-500 hidden md:table-cell font-mono">{r.referrerId.slice(-8)}</td>
                  <td className="px-5 py-4 text-sm text-slate-500 hidden md:table-cell font-mono">{r.refereeId.slice(-8)}</td>
                  <td className="px-5 py-4"><Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge></td>
                  <td className="px-5 py-4 text-sm text-slate-500">{formatDate(r.sharedAt)}</td>
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
