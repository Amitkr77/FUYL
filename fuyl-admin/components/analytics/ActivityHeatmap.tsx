'use client'

import type { HeatmapCell } from '@/lib/analytics'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

function getColor(count: number, max: number): string {
  if (max === 0 || count === 0) return '#f1f5f9'
  const intensity = count / max
  const g = Math.round(132 + (255 - 132) * (1 - intensity))
  const r = Math.round(85 + (241 - 85) * (1 - intensity))
  const b = Math.round(118 + (249 - 118) * (1 - intensity))
  // Blend from brand-forest (#558476) at high intensity to slate-100 (#f1f5f9) at low
  return `rgb(${r},${g},${b})`
}

export default function ActivityHeatmap({ data }: { data: HeatmapCell[] }) {
  // Build a 7×24 grid: cellMap[day][hour]
  const cellMap: Record<number, Record<number, number>> = {}
  for (let d = 1; d <= 7; d++) {
    cellMap[d] = {}
    for (let h = 0; h < 24; h++) cellMap[d][h] = 0
  }
  for (const cell of data) {
    if (cellMap[cell.day]) cellMap[cell.day][cell.hour] = (cellMap[cell.day][cell.hour] ?? 0) + cell.count
  }
  const max = Math.max(...data.map((c) => c.count), 1)

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Activity by Hour &amp; Day</h3>
      {data.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">No activity data yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Hour labels */}
            <div className="flex ml-8 mb-1">
              {HOURS.map((h) => (
                <div key={h} className="flex-1 text-center text-[9px] text-slate-400">
                  {h % 3 === 0 ? `${h}h` : ''}
                </div>
              ))}
            </div>
            {/* Grid rows (day 1=Sun…7=Sat) */}
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <div key={day} className="flex items-center gap-0.5 mb-0.5">
                <span className="w-7 text-[10px] text-slate-400 shrink-0">{DAYS[day - 1]}</span>
                {HOURS.map((hour) => {
                  const count = cellMap[day]?.[hour] ?? 0
                  return (
                    <div
                      key={hour}
                      title={`${DAYS[day - 1]} ${hour}:00 — ${count} events`}
                      className="flex-1 h-5 rounded-[2px] transition-colors"
                      style={{ backgroundColor: getColor(count, max) }}
                    />
                  )
                })}
              </div>
            ))}
            {/* Legend */}
            <div className="flex items-center gap-2 mt-3 justify-end">
              <span className="text-[10px] text-slate-400">Less</span>
              {[0, 0.25, 0.5, 0.75, 1].map((t) => (
                <div key={t} className="w-4 h-4 rounded-[2px]" style={{ backgroundColor: getColor(Math.round(t * max), max) }} />
              ))}
              <span className="text-[10px] text-slate-400">More</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
