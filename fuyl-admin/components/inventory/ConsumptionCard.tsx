'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TrendingDown, Package, Clock, Zap } from 'lucide-react'
import type { ConsumptionStats, StockRow } from '@/lib/inventory'

interface Props {
  consumption: ConsumptionStats
  stock: StockRow[]
  period: number
}

function formatDate(dateStr: string, short = false) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: short ? 'short' : 'long',
    year: short ? undefined : 'numeric',
  })
}

function labelInterval(totalBars: number): number {
  if (totalBars <= 7)  return 1
  if (totalBars <= 14) return 2
  return 5
}

export function ConsumptionCard({ consumption, stock, period }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const totalAvailable = stock.reduce((sum, s) => sum + s.available, 0)
  const daysRemaining  =
    consumption.dailyRate > 0
      ? Math.floor(totalAvailable / consumption.dailyRate)
      : null

  const max     = Math.max(...consumption.byDay.map((d) => d.units), 1)
  const peakDay = consumption.byDay.reduce<{ date: string; units: number } | null>(
    (best, d) => (d.units > (best?.units ?? 0) ? d : best),
    null,
  )

  const stockStatus =
    daysRemaining === null
      ? 'neutral'
      : daysRemaining < 14
      ? 'critical'
      : daysRemaining < 45
      ? 'warning'
      : 'good'

  const stockColor = {
    critical: 'text-rose-600',
    warning:  'text-amber-500',
    good:     'text-emerald-600',
    neutral:  'text-slate-300',
  }[stockStatus]

  const interval = labelInterval(consumption.byDay.length)

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">Consumption Rate</h3>
        </div>

        {/* Period pill toggle */}
        <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
          {([7, 14, 30] as const).map((d) => (
            <Link
              key={d}
              href={`/inventory?period=${d}`}
              className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-all ${
                period === d
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {d}d
            </Link>
          ))}
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4 mb-6 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Zap className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-xs text-slate-400">Daily rate</p>
          </div>
          <p className="text-2xl font-bold text-slate-800 leading-none">
            {consumption.dailyRate}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">units / day</p>
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-xs text-slate-400">Units sold</p>
          </div>
          <p className="text-2xl font-bold text-slate-800 leading-none">
            {consumption.totalUnits}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">in last {period} days</p>
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Package className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-xs text-slate-400">In stock</p>
          </div>
          <p className="text-2xl font-bold text-slate-800 leading-none">
            {totalAvailable}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">units available</p>
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-xs text-slate-400">Stock runway</p>
          </div>
          <p className={`text-2xl font-bold leading-none ${stockColor}`}>
            {daysRemaining === null
              ? '—'
              : daysRemaining > 999
              ? '999+'
              : `~${daysRemaining}`}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {daysRemaining === null
              ? 'no sales recorded'
              : daysRemaining < 14
              ? 'days left — reorder soon!'
              : daysRemaining < 45
              ? 'days left — watch closely'
              : 'days of stock left'}
          </p>
        </div>
      </div>

      {/* ── Bar chart ── */}
      {consumption.byDay.length > 0 ? (
        <div>
          <div className="relative flex items-end gap-[2px] h-24">
            {consumption.byDay.map((d, i) => {
              const hasUnits   = d.units > 0
              const heightPct  = hasUnits ? Math.max(8, (d.units / max) * 100) : 0
              const isHovered  = hoveredIdx === i
              const isPeak     = peakDay?.date === d.date && hasUnits

              return (
                <div
                  key={d.date}
                  className="relative flex-1 flex flex-col justify-end h-full cursor-default"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* Hover tooltip */}
                  {isHovered && (
                    <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                      <div className="bg-slate-800 text-white rounded-lg px-2.5 py-2 whitespace-nowrap shadow-xl text-center">
                        <p className="text-[11px] text-slate-300">{formatDate(d.date)}</p>
                        <p className="text-sm font-bold mt-0.5">
                          {d.units} unit{d.units !== 1 ? 's' : ''}
                        </p>
                        {isPeak && (
                          <p className="text-[10px] text-amber-400 mt-0.5">Peak day</p>
                        )}
                      </div>
                      {/* Arrow */}
                      <div className="flex justify-center">
                        <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-slate-800" />
                      </div>
                    </div>
                  )}

                  {/* Bar */}
                  <div className="w-full flex flex-col justify-end" style={{ height: '100%' }}>
                    {hasUnits ? (
                      <div
                        className={`w-full rounded-t-sm transition-colors duration-150 ${
                          isPeak
                            ? isHovered ? 'bg-amber-500' : 'bg-amber-400'
                            : isHovered ? 'bg-[#558476]' : 'bg-emerald-400'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    ) : (
                      <div className="w-full h-[3px] rounded-sm bg-slate-100" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* X-axis date labels */}
          <div className="flex items-start gap-[2px] mt-2">
            {consumption.byDay.map((d, i) => {
              const isFirst = i === 0
              const isLast  = i === consumption.byDay.length - 1
              const showLabel = isFirst || isLast || i % interval === 0
              return (
                <div key={d.date} className="flex-1 flex justify-center overflow-visible">
                  {showLabel && (
                    <p className="text-[10px] text-slate-400 whitespace-nowrap leading-none">
                      {formatDate(d.date, true)}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="h-24 flex items-center justify-center rounded-lg bg-slate-50">
          <p className="text-sm text-slate-400">No movement data for this period</p>
        </div>
      )}

      {/* ── Footer note ── */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
        <p className="text-[11px] text-slate-400">
          {peakDay && peakDay.units > 0 ? (
            <>
              Peak day:{' '}
              <span className="text-slate-600 font-medium">
                {formatDate(peakDay.date)} — {peakDay.units} unit{peakDay.units !== 1 ? 's' : ''}
              </span>
            </>
          ) : (
            'Based on fulfilled order movements'
          )}
        </p>
        <Link
          href="/orders"
          className="text-[11px] text-[#558476] font-semibold hover:underline"
        >
          View orders →
        </Link>
      </div>
    </div>
  )
}
