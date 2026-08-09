'use client'

import type { FunnelStep } from '@/lib/analytics'

export default function FunnelChart({ data }: { data: FunnelStep[] }) {
  const max = data[0]?.count ?? 1

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-5">Conversion Funnel</h3>
      {data.every((d) => d.count === 0) ? (
        <p className="text-sm text-slate-400 py-6 text-center">No event data yet — visit tracking will populate this once the PageTracker is active.</p>
      ) : (
        <div className="space-y-2">
          {data.map((step, i) => {
            const pct = max > 0 ? (step.count / max) * 100 : 0
            const convPct = i > 0 && data[i - 1].count > 0
              ? Math.round((step.count / data[i - 1].count) * 100)
              : null
            return (
              <div key={step.step}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-700">{step.step}</span>
                  <div className="flex items-center gap-3">
                    {convPct !== null && (
                      <span className="text-xs text-slate-400">{convPct}% from prev</span>
                    )}
                    <span className="text-xs font-semibold text-slate-900">{step.count.toLocaleString()}</span>
                  </div>
                </div>
                <div className="w-full h-7 bg-slate-100 rounded-lg overflow-hidden">
                  <div
                    className="h-full rounded-lg transition-all duration-500 flex items-center pl-3"
                    style={{
                      width: `${Math.max(pct, 2)}%`,
                      background: `hsl(${160 - i * 20}, 55%, ${45 + i * 5}%)`,
                    }}
                  >
                    {pct > 15 && <span className="text-white text-xs font-medium">{Math.round(pct)}%</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
