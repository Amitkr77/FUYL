'use client'

import { useState, useMemo } from 'react'
import { Monitor, Smartphone, Tablet, MapPin, Clock, ChevronDown, Search, Users } from 'lucide-react'
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

type SessionFilter = 'all' | 'users' | 'guests'

const PAGE_SIZE = 20

export default function UserActivityTable({ data }: { data: UserActivityRow[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState<SessionFilter>('all')
  const [page,     setPage]     = useState(1)

  const filtered = useMemo(() => {
    return data.filter((row) => {
      if (filter === 'users'  && !row.userId) return false
      if (filter === 'guests' &&  row.userId) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        row.sessionId.toLowerCase().includes(q) ||
        (row.userId ?? '').toLowerCase().includes(q) ||
        row.os.toLowerCase().includes(q) ||
        row.deviceType.toLowerCase().includes(q) ||
        row.pages.some((p) => p.toLowerCase().includes(q))
      )
    })
  }, [data, search, filter])

  const pageCount  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const curPage    = Math.min(page, pageCount)
  const paged      = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE)

  const authCount  = data.filter((r) =>  r.userId).length
  const guestCount = data.filter((r) => !r.userId).length

  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-slate-100">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">User Activity</h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-medium tabular-nums">
              {filtered.length}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">Recent session data</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Session type pills */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs font-medium">
            {(['all', 'users', 'guests'] as SessionFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => { setFilter(f); setPage(1) }}
                className={`px-2.5 py-1 rounded-md capitalize transition-colors ${
                  filter === f
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {f}
              </button>
            ))}
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
              {search || filter !== 'all' ? 'Try adjusting your filters' : 'No session data yet'}
            </p>
          </div>
        ) : (
          paged.map((row) => {
            const isOpen = expanded === row.sessionId
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
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                      {row.os} · {row.deviceType} · {row.pages.length} page{row.pages.length !== 1 ? 's' : ''} · {row.eventCount} events
                    </p>
                  </div>

                  {/* Duration + timestamp */}
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-xs font-semibold text-slate-700 tabular-nums flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3 text-slate-300" />
                      {formatDuration(row.totalTimeMs)}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
                      {new Date(row.lastSeen).toLocaleDateString('en-IN', {
                        month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
                      })}
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
                      {/* Stats chips */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Clock className="w-3 h-3 text-slate-400" />
                          Duration: <span className="font-semibold text-slate-900 ml-0.5">{formatDuration(row.totalTimeMs)}</span>
                        </div>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-600">
                          Events: <span className="font-semibold text-slate-900">{row.eventCount}</span>
                        </span>
                        {row.lat !== null && row.lng !== null && (
                          <>
                            <span className="text-slate-300">·</span>
                            <div className="flex items-center gap-1 text-xs text-slate-600">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span className="tabular-nums">{row.lat.toFixed(4)}, {row.lng.toFixed(4)}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Pages visited */}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                          Pages visited
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {row.pages.slice(0, 20).map((page, i) => (
                            <span
                              key={i}
                              className="text-[10px] bg-white border border-slate-200 text-slate-600 rounded-md px-2 py-0.5 font-mono"
                            >
                              {page}
                            </span>
                          ))}
                          {row.pages.length > 20 && (
                            <span className="text-[10px] text-slate-400 italic self-center">
                              +{row.pages.length - 20} more
                            </span>
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
