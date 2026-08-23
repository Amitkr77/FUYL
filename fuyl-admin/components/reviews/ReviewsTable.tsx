'use client'

import { useMemo, useState, useTransition } from 'react'
import { Star, ShieldCheck, Flag, Search, X } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import type { AdminReview, ReviewStatus } from '@/lib/reviews'
import { moderateReviewAction } from '@/app/(admin)/reviews/actions'
import { Pagination } from '@/components/ui/Pagination'

const STATUS_VARIANT: Record<ReviewStatus, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  flagged: 'danger',
}

const TABS: { value: ReviewStatus | 'all'; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
]

const PAGE_SIZE = 10

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`w-3.5 h-3.5 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
      ))}
    </div>
  )
}

function RowActions({ r }: { r: AdminReview }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const run = (status: ReviewStatus, moderationNote?: string) => {
    setError('')
    startTransition(async () => {
      const result = await moderateReviewAction(r.id, status, moderationNote)
      if ('error' in result) setError(result.error)
    })
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        {r.status !== 'approved' && (
          <button
            onClick={() => run('approved')}
            disabled={isPending}
            className="px-3 py-1.5 text-xs font-medium text-white bg-[#558476] hover:bg-[#457366] rounded-lg transition-colors disabled:opacity-50"
          >
            Approve
          </button>
        )}
        {r.status !== 'rejected' && (
          <button
            onClick={() => {
              const note = prompt('Reason for rejecting this review? (optional)')
              if (note === null) return // cancelled
              run('rejected', note || undefined)
            }}
            disabled={isPending}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Reject
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

export function ReviewsTable({ reviews }: { reviews: AdminReview[] }) {
  const [tab, setTab] = useState<ReviewStatus | 'all'>('pending')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)

  const counts = useMemo(() => {
    const c: Record<ReviewStatus, number> = { pending: 0, approved: 0, rejected: 0, flagged: 0 }
    for (const r of reviews) c[r.status]++
    return c
  }, [reviews])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    let rows = tab === 'all' ? reviews : reviews.filter((r) => r.status === tab)
    if (term) rows = rows.filter((r) =>
      r.authorName.toLowerCase().includes(term) ||
      r.productName.toLowerCase().includes(term) ||
      (r.title ?? '').toLowerCase().includes(term) ||
      r.body.toLowerCase().includes(term)
    )
    return [...rows].sort((a, b) => {
      if (sort === 'oldest')  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      if (sort === 'highest') return b.rating - a.rating
      if (sort === 'lowest')  return a.rating - b.rating
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [reviews, tab, search, sort])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const curPage   = Math.min(page, pageCount)
  const paged     = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE)

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      {/* Status tabs */}
      <div className="flex items-center gap-1 px-4 pt-3 border-b border-slate-100 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => { setTab(t.value); setPage(1) }}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.value
                ? 'border-[#558476] text-[#558476]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            {t.label}
            {t.value !== 'all' && counts[t.value] > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                {counts[t.value]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search + sort toolbar */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            placeholder="Search author, product, content…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#558476]/30"
          />
          {search && <button onClick={() => { setSearch(''); setPage(1) }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
          <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1) }}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-600">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest">Highest rated</option>
            <option value="lowest">Lowest rated</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Review</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Product</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Submitted</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paged.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400 text-sm">No reviews here.</td></tr>
            ) : (
              paged.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors align-top">
                  <td className="px-5 py-4 max-w-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Stars rating={r.rating} />
                      <span className="text-sm font-medium text-slate-900">{r.authorName}</span>
                      {r.isVerifiedPurchase && (
                        <span title="Verified Purchase"><ShieldCheck className="w-3.5 h-3.5 text-[#558476]" /></span>
                      )}
                      {r.reportedCount > 0 && (
                        <span title={`Reported ${r.reportedCount}×`} className="flex items-center gap-0.5 text-amber-600">
                          <Flag className="w-3 h-3" />
                          <span className="text-[10px] font-semibold">{r.reportedCount}</span>
                        </span>
                      )}
                    </div>
                    {r.title && <p className="text-sm font-semibold text-slate-900">{r.title}</p>}
                    <p className="text-sm text-slate-500 line-clamp-3">{r.body}</p>
                    {r.moderationNote && (
                      <p className="text-xs text-slate-400 mt-1 italic">Note: {r.moderationNote}</p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-700 hidden md:table-cell">{r.productName}</td>
                  <td className="px-5 py-4"><Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge></td>
                  <td className="px-5 py-4 text-sm text-slate-500 hidden lg:table-cell">{formatDate(r.createdAt)}</td>
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
