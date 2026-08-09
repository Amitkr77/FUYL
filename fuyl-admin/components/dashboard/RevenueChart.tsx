'use client'

import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import type { ChartPoint } from '@/lib/analytics'

const formatRevenue = (v: number) =>
  v >= 100_000
    ? `₹${(v / 100_000).toFixed(1)}L`
    : `₹${(v / 1_000).toFixed(0)}k`

export default function RevenueChart({ data }: { data: ChartPoint[] }) {
  const totalRevenue = data.reduce((s, p) => s + p.revenue, 0)
  const totalOrders  = data.reduce((s, p) => s + p.orders, 0)

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Revenue Overview</h3>
          <p className="text-sm text-slate-500 mt-0.5">Last 7 days</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-lg font-bold text-slate-900 tabular-nums">
              {totalRevenue.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Total revenue</p>
          </div>
          <div className="w-px h-8 bg-slate-100" />
          <div className="text-right">
            <p className="text-lg font-bold text-slate-900 tabular-nums">{totalOrders}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Total orders</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#558476]" />
          <span className="text-xs text-slate-500">Revenue</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 border-t-2 border-dashed border-[#B76E79]" />
          <span className="text-xs text-slate-500">Orders</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#558476" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#558476" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="rev"
            tickFormatter={formatRevenue}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <YAxis
            yAxisId="ord"
            orientation="right"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            width={28}
          />

          <Tooltip
            formatter={(value: number, name: string) =>
              name === 'revenue'
                ? [`₹${value.toLocaleString('en-IN')}`, 'Revenue']
                : [value, 'Orders']
            }
            contentStyle={{
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
              fontSize: '12px',
              padding: '10px 14px',
            }}
            cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }}
          />

          <Area
            yAxisId="rev"
            type="monotone"
            dataKey="revenue"
            stroke="#558476"
            strokeWidth={2.5}
            fill="url(#revenueGrad)"
            dot={{ fill: '#558476', r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#558476', stroke: 'white', strokeWidth: 2 }}
          />
          <Line
            yAxisId="ord"
            type="monotone"
            dataKey="orders"
            stroke="#B76E79"
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={false}
            activeDot={{ r: 4, fill: '#B76E79', stroke: 'white', strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
