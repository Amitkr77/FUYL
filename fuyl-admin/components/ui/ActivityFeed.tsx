'use client'

import { Activity, ChevronRight } from 'lucide-react'
import { type AuditLogEntry } from '@/lib/auditLog'
import { formatDateTime } from '@/lib/utils'

const ACTION_COLORS: Record<string, string> = {
  created:        'bg-emerald-100 text-emerald-700',
  updated:        'bg-blue-100 text-blue-700',
  deleted:        'bg-red-100 text-red-700',
  published:      'bg-emerald-100 text-emerald-700',
  unpublished:    'bg-slate-100 text-slate-500',
  status_changed: 'bg-amber-100 text-amber-700',
  adjusted:       'bg-violet-100 text-violet-700',
  reactivated:    'bg-emerald-100 text-emerald-700',
  deactivated:    'bg-red-100 text-red-700',
}

function ActionBadge({ action }: { action: string }) {
  const cls = ACTION_COLORS[action] ?? 'bg-slate-100 text-slate-500'
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      {action.replace(/_/g, ' ')}
    </span>
  )
}

interface ActivityFeedProps {
  logs: AuditLogEntry[]
  title?: string
  className?: string
}

export function ActivityFeed({ logs, title = 'Activity Log', className = '' }: ActivityFeedProps) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl shadow-sm ${className}`}>
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
        <Activity className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {logs.length > 0 && (
          <span className="text-xs text-slate-400 ml-1">{logs.length} recent</span>
        )}
      </div>

      {logs.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-sm text-slate-400">No activity recorded yet</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-50">
          {logs.map((log) => (
            <li key={log._id} className="px-5 py-3 flex items-start gap-3">
              {/* Actor avatar */}
              <div className="w-7 h-7 rounded-full bg-[#558476]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-[#558476] uppercase">
                  {log.actorEmail.charAt(0)}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center flex-wrap gap-1.5">
                  <span className="text-xs font-medium text-slate-700 truncate max-w-[120px]">
                    {log.actorName || log.actorEmail}
                  </span>
                  <ActionBadge action={log.action} />
                  {log.targetLabel && (
                    <>
                      <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />
                      <span className="text-xs text-slate-600 font-medium truncate">{log.targetLabel}</span>
                    </>
                  )}
                </div>
                {log.detail && (
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">{log.detail}</p>
                )}
                <p className="text-[10px] text-slate-300 mt-0.5">{formatDateTime(log.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
