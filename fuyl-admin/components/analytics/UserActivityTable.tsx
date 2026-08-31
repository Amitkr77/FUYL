'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Monitor, Smartphone, Tablet, MapPin, Clock, ChevronDown, Search, Users, ArrowRight, SlidersHorizontal, TrendingUp, BarChart2, ShoppingBag, ShoppingCart, Eye, ExternalLink } from 'lucide-react'
import type { UserActivityRow } from '@/lib/analytics'
import { Pagination } from '@/components/ui/Pagination'

function DeviceIcon({ type }: { type: string }) {
  if (type === 'Mobile') return <Smartphone className="w-3.5 h-3.5" />
  if (type === 'Tablet') return <Tablet      className="w-3.5 h-3.5" />
  return                        <Monitor     className="w-3.5 h-3.5" />
}

function formatDuration(ms: number): string {
  if (ms < 1000) return '<1s'
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

function isBounce(row: UserActivityRow): boolean {
  return row.pages.length <= 1 && row.totalTimeMs < 30_000
}

function OutcomeBadge({ outcome }: { outcome: UserActivityRow['outcome'] }) {
  if (outcome === 'purchased') return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-green-50 text-green-600">
      <ShoppingBag className="w-2.5 h-2.5" /> Purchased
    </span>
  )
  if (outcome === 'abandoned') return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-orange-50 text-orange-500">
      <ShoppingCart className="w-2.5 h-2.5" /> Abandoned
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">
      <Eye className="w-2.5 h-2.5" /> Browsed
    </span>
  )
}

type SessionFilter = 'all' | 'users' | 'guests'
type DeviceFilter  = 'all' | 'Mobile' | 'Tablet' | 'Desktop'
type OutcomeFilter = 'all' | 'purchased' | 'abandoned' | 'browsed'
type SortKey       = 'newest' | 'oldest' | 'longest' | 'shortest' | 'most-pages' | 'most-events'

const PAGE_SIZE = 20

export default function UserActivityTable({ data }: { data: UserActivityRow[] }) {
  const [expanded,       setExpanded]       = useState<string | null>(null)
  const [search,         setSearch]         = useState('')
  const [filter,         setFilter]         = useState<SessionFilter>('all')
  const [deviceFilter,   setDeviceFilter]   = useState<DeviceFilter>('all')
  const [outcomeFilter,  setOutcomeFilter]  = useState<OutcomeFilter>('all')
  const [sortKey,        setSortKey]        = useState<SortKey>('newest')
  const [page,           setPage]           = useState(1)

  // ── Summary stats (computed over full dataset) ─────────────────────────────
  const stats = useMemo(() => {
    if (data.length === 0) return null
    const bounces    = data.filter(isBounce).length
    const purchased  = data.filter((r) => r.outcome === 'purchased').length
    const totalDurMs = data.reduce((s, r) => s + r.totalTimeMs, 0)
    const totalPages = data.reduce((s, r) => s + r.pages.length, 0)
    return {
      avgDuration: Math.round(totalDurMs / data.length),
      avgPages:    (totalPages / data.length).toFixed(1),
      bounceRate:  Math.round((bounces / data.length) * 100),
      convRate:    Math.round((purchased / data.length) * 100),
    }
  }, [data])

  // ── Filtering + sorting ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let rows = data.filter((row) => {
      if (filter === 'users'  && !row.userId) return false
      if (filter === 'guests' &&  row.userId) return false
      if (deviceFilter  !== 'all' && row.deviceType !== deviceFilter)  return false
      if (outcomeFilter !== 'all' && row.outcome    !== outcomeFilter)  return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        row.sessionId.toLowerCase().includes(q) ||
        (row.userId ?? '').toLowerCase().includes(q) ||
        row.os.toLowerCase().includes(q) ||
        row.deviceType.toLowerCase().includes(q) ||
        (row.city ?? '').toLowerCase().includes(q) ||
        row.pages.some((p) => p.toLowerCase().includes(q))
      )
    })

    rows = [...rows].sort((a, b) => {
      switch (sortKey) {
        case 'newest':      return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
        case 'oldest':      return new Date(a.lastSeen).getTime() - new Date(b.lastSeen).getTime()
        case 'longest':     return b.totalTimeMs - a.totalTimeMs
        case 'shortest':    return a.totalTimeMs - b.totalTimeMs
        case 'most-pages':  return b.pages.length - a.pages.length
        case 'most-events': return b.eventCount - a.eventCount
        default:            return 0
      }
    })

    return rows
  }, [data, search, filter, deviceFilter, outcomeFilter, sortKey])

  const pageCount  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const curPage    = Math.min(page, pageCount)
  const paged      = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE)

  const authCount  = data.filter((r) =>  r.userId).length
  const guestCount = data.filter((r) => !r.userId).length

  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">

      {/* ── Summary stats bar ───────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-4 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5 px-4 py-3">
            <div className="w-7 h-7 rounded-lg bg-[#558476]/10 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5 text-[#558476]" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Avg Duration</p>
              <p className="text-sm font-bold text-slate-800 tabular-nums">{formatDuration(stats.avgDuration)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 px-4 py-3">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <BarChart2 className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Avg Pages</p>
              <p className="text-sm font-bold text-slate-800 tabular-nums">{stats.avgPages}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 px-4 py-3">
            <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
              <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Bounce Rate</p>
              <p className="text-sm font-bold text-slate-800 tabular-nums">{stats.bounceRate}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 px-4 py-3">
            <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-3.5 h-3.5 text-green-600" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Conv. Rate</p>
              <p className="text-sm font-bold text-slate-800 tabular-nums">{stats.convRate}%</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Header / filters ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 px-5 py-4 border-b border-slate-100">
        {/* Top row: title + search */}
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900">User Activity</h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-medium tabular-nums">
                {filtered.length}
              </span>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="search"
              placeholder="Search sessions…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-8 pr-3 h-8 w-44 text-xs border border-slate-200 rounded-lg bg-slate-50 outline-none focus:bg-white focus:border-[#558476] focus:ring-2 focus:ring-[#558476]/20 transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Filter pills row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Session type */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs font-medium">
            {(['all', 'users', 'guests'] as SessionFilter[]).map((f) => (
              <button key={f} type="button" onClick={() => { setFilter(f); setPage(1) }}
                className={`px-2.5 py-1 rounded-md capitalize transition-colors ${filter === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {f}
              </button>
            ))}
          </div>

          {/* Device type */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs font-medium">
            {(['all', 'Mobile', 'Tablet', 'Desktop'] as DeviceFilter[]).map((d) => (
              <button key={d} type="button" onClick={() => { setDeviceFilter(d); setPage(1) }}
                className={`px-2.5 py-1 rounded-md capitalize transition-colors ${deviceFilter === d ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {d}
              </button>
            ))}
          </div>

          {/* Outcome filter */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs font-medium">
            {(['all', 'purchased', 'abandoned', 'browsed'] as OutcomeFilter[]).map((o) => (
              <button key={o} type="button" onClick={() => { setOutcomeFilter(o); setPage(1) }}
                className={`px-2.5 py-1 rounded-md capitalize transition-colors ${outcomeFilter === o ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {o}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="relative flex items-center gap-1.5 ml-auto">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortKey}
              onChange={(e) => { setSortKey(e.target.value as SortKey); setPage(1) }}
              className="text-xs text-slate-600 bg-transparent border-none outline-none cursor-pointer pr-1 font-medium"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="longest">Longest duration</option>
              <option value="shortest">Shortest duration</option>
              <option value="most-pages">Most pages</option>
              <option value="most-events">Most events</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Scrollable list ─────────────────────────────────────────────────── */}
      <div className="divide-y divide-slate-50">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
              <Users className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">No sessions found</p>
            <p className="text-xs text-slate-400 mt-1">
              {search || filter !== 'all' || deviceFilter !== 'all' || outcomeFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'No session data yet'}
            </p>
          </div>
        ) : (
          paged.map((row) => {
            const isOpen    = expanded === row.sessionId
            const bounce    = isBounce(row)
            const entryPage = row.pages[0] ?? '/'
            const exitPage  = row.pages.length > 1 ? row.pages[row.pages.length - 1] : null
            const location  = row.city ?? (row.lat !== null && row.lng !== null ? `${row.lat.toFixed(2)}, ${row.lng.toFixed(2)}` : null)

            return (
              <div key={row.sessionId}>
                {/* Row */}
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : row.sessionId)}
                  className="w-full flex items-center gap-3 py-3 px-5 text-left hover:bg-slate-50/70 transition-colors"
                >
                  {/* Device badge */}
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-500">
                    <DeviceIcon type={row.deviceType} />
                  </div>

                  {/* Identity + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-slate-900">
                        {row.userId ? `User ···${row.userId.slice(-6)}` : 'Guest'}
                      </span>
                      <span className="text-slate-300 text-[10px]">·</span>
                      <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                        {row.sessionId.slice(-8)}
                      </span>
                      {row.userId && (
                        <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-[#558476]/10 text-[#558476]">
                          Auth
                        </span>
                      )}
                      <OutcomeBadge outcome={row.outcome} />
                      {bounce && (
                        <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-red-50 text-red-500">
                          Bounce
                        </span>
                      )}
                    </div>
                    {/* Entry → exit journey hint */}
                    <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-400 truncate">
                      <span className="font-mono truncate max-w-[100px]">{entryPage}</span>
                      {exitPage && (
                        <>
                          <ArrowRight className="w-2.5 h-2.5 shrink-0 text-slate-300" />
                          <span className="font-mono truncate max-w-[100px]">{exitPage}</span>
                        </>
                      )}
                      <span className="text-slate-300 shrink-0">·</span>
                      <span className="shrink-0">{row.pages.length}p · {row.eventCount}ev</span>
                      {location && (
                        <>
                          <span className="text-slate-300 shrink-0">·</span>
                          <MapPin className="w-2.5 h-2.5 shrink-0 text-slate-300" />
                          <span className="truncate max-w-[80px]">{location}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Duration + timestamp */}
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-xs font-semibold text-slate-700 tabular-nums flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3 text-slate-300" />
                      {formatDuration(row.totalTimeMs)}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
                      {formatTime(row.lastSeen)}
                    </p>
                  </div>

                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-300 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="px-5 pb-4 bg-slate-50/60 border-t border-slate-100">
                    <div className="pt-3 space-y-3">
                      {/* Stats + links row */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span className="font-semibold text-slate-900">{formatDuration(row.totalTimeMs)}</span>
                        </div>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-600">
                          Started: <span className="font-semibold text-slate-900">{formatTime(row.startedAt)}</span>
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-600">
                          Ended: <span className="font-semibold text-slate-900">{formatTime(row.lastSeen)}</span>
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-600">
                          OS: <span className="font-semibold text-slate-900">{row.os}</span>
                        </span>
                        {location && (
                          <>
                            <span className="text-slate-300">·</span>
                            <div className="flex items-center gap-1 text-xs text-slate-600">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{location}</span>
                            </div>
                          </>
                        )}
                        {bounce && (
                          <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-red-50 text-red-500">
                            Single-page bounce
                          </span>
                        )}
                        {row.userId && (
                          <Link
                            href={`/customers/${row.userId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-[#558476] hover:underline"
                          >
                            View customer <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        )}
                      </div>

                      {/* Page journey */}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                          Page journey
                        </p>
                        <div className="flex flex-col gap-1">
                          {row.pages.slice(0, 20).map((p, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-300 tabular-nums w-4 shrink-0 text-right">
                                {i + 1}
                              </span>
                              <div className="flex items-center gap-1.5 min-w-0">
                                {i === 0 && (
                                  <span className="text-[9px] font-semibold uppercase tracking-wide px-1 py-0.5 rounded bg-green-50 text-green-600 shrink-0">
                                    Entry
                                  </span>
                                )}
                                {i === row.pages.length - 1 && row.pages.length > 1 && (
                                  <span className="text-[9px] font-semibold uppercase tracking-wide px-1 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">
                                    Exit
                                  </span>
                                )}
                                <span className="text-[10px] font-mono text-slate-600 truncate">{p}</span>
                              </div>
                            </div>
                          ))}
                          {row.pages.length > 20 && (
                            <p className="text-[10px] text-slate-400 italic pl-6">
                              +{row.pages.length - 20} more pages
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      {data.length > 0 && (
        <div>
          <Pagination page={curPage} pageCount={pageCount} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
          <div className="px-5 py-2 border-t border-slate-50 bg-slate-50/50 flex items-center justify-end gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#558476]" />
              {authCount} auth
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              {guestCount} guest
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
