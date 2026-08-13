'use client'

import {
  ResponsiveContainer,
  LineChart as RechartsLine,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import type { PerformanceDataPoint } from '@/lib/api/affiliate'
import { Skeleton } from '@/components/ui/Skeleton'

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, formatter }: {
  active?: boolean
  payload?: Array<{ value?: number }>
  label?: string
  formatter?: (v: number) => string
}) {
  if (!active || !payload?.length) return null
  const value = payload[0]?.value ?? 0
  return (
    <div className="bg-brand-forest text-white text-body-xs rounded-lg px-3 py-2 shadow-lg">
      <p className="text-brand-sage mb-0.5">{label}</p>
      <p className="font-semibold">{formatter ? formatter(value) : value.toLocaleString('en-IN')}</p>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface LineChartProps {
  data:        PerformanceDataPoint[]
  color?:      string          // stroke color — defaults to brand-teal
  height?:     number          // chart height in px — defaults to 260
  loading?:    boolean
  formatter?:  (v: number) => string   // y-axis + tooltip value formatter
  emptyMessage?: string
}

export function LineChart({
  data,
  color      = '#558476',   // brand-teal
  height     = 260,
  loading    = false,
  formatter,
  emptyMessage = 'No data for the selected period.',
}: LineChartProps) {
  if (loading) {
    return <Skeleton className="w-full rounded-xl" style={{ height }} />
  }

  const allZero = data.every((d) => d.value === 0)

  if (data.length === 0 || allZero) {
    return (
      <div
        className="w-full flex items-center justify-center text-brand-muted text-body-sm bg-brand-cream/40 rounded-xl border border-brand-border"
        style={{ height }}
      >
        {emptyMessage}
      </div>
    )
  }

  // Show a shortened date label — "Jul 15" instead of "2026-07-15"
  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  const formatted = data.map((d) => ({ ...d, label: formatDate(d.date) }))

  // Show at most 6 evenly-spaced x-axis ticks to prevent overcrowding
  const tickInterval = Math.max(1, Math.floor(formatted.length / 6))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLine
        data={formatted}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#C8D8B0"   // brand-border
          vertical={false}
        />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: '#4A5A3A', fontFamily: 'inherit' }}
          tickLine={false}
          axisLine={false}
          interval={tickInterval - 1}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#4A5A3A', fontFamily: 'inherit' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatter ?? ((v) => v.toLocaleString('en-IN'))}
          width={48}
        />
        <Tooltip
          content={(props) => <ChartTooltip {...props} formatter={formatter} />}
          cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '3 3' }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
        />
      </RechartsLine>
    </ResponsiveContainer>
  )
}
