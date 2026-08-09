'use client'

import { useState } from 'react'
import { Monitor, Smartphone, Tablet, MapPin, Clock, ChevronDown } from 'lucide-react'
import type { UserActivityRow } from '@/lib/analytics'

function DeviceIcon({ type }: { type: string }) {
  if (type === 'Mobile')  return <Smartphone className="w-3.5 h-3.5" />
  if (type === 'Tablet')  return <Tablet      className="w-3.5 h-3.5" />
  return                         <Monitor      className="w-3.5 h-3.5" />
}

function formatDuration(ms: number): string {
  if (ms < 1000) return '<1s'
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

export default function UserActivityTable({ data }: { data: UserActivityRow[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">User Activity</h3>
      {data.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">No session data yet.</p>
      ) : (
        <div className="divide-y divide-slate-50">
          {data.map((row) => (
            <div key={row.sessionId}>
              <button
                type="button"
                onClick={() => setExpanded(expanded === row.sessionId ? null : row.sessionId)}
                className="w-full flex items-center gap-3 py-3 text-left hover:bg-slate-50 transition-colors rounded-lg px-1"
              >
                {/* Device icon */}
                <span className="text-slate-400 shrink-0">
                  <DeviceIcon type={row.deviceType} />
                </span>
                {/* Session ID / User */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-900 truncate">
                    {row.userId ? `User ${row.userId.slice(-6)}` : 'Guest'} · {row.sessionId.slice(-8)}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {row.os} · {row.deviceType} · {row.pages.length} page{row.pages.length !== 1 ? 's' : ''}
                  </p>
                </div>
                {/* Time info */}
                <div className="text-right shrink-0">
                  <p className="text-xs text-slate-700 flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {formatDuration(row.totalTimeMs)}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {new Date(row.lastSeen).toLocaleDateString('en-IN', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {/* Expand chevron */}
                <ChevronDown className={`w-3.5 h-3.5 text-slate-300 shrink-0 transition-transform ${expanded === row.sessionId ? 'rotate-180' : ''}`} />
              </button>

              {/* Expanded detail */}
              {expanded === row.sessionId && (
                <div className="pl-7 pb-3 space-y-2">
                  {row.lat !== null && row.lng !== null && (
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {row.lat.toFixed(4)}, {row.lng.toFixed(4)}
                    </p>
                  )}
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Pages visited</p>
                    <div className="flex flex-wrap gap-1">
                      {row.pages.slice(0, 20).map((page, i) => (
                        <span key={i} className="text-[10px] bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 font-mono">
                          {page}
                        </span>
                      ))}
                      {row.pages.length > 20 && (
                        <span className="text-[10px] text-slate-400">+{row.pages.length - 20} more</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
