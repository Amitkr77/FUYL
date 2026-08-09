'use client'

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import type { DeviceBreakdown } from '@/lib/analytics'

const DEVICE_COLORS = ['#558476', '#60a5fa', '#f59e0b', '#a78bfa', '#fb923c']
const OS_COLORS     = ['#10b981', '#3b82f6', '#f97316', '#8b5cf6', '#ec4899', '#6b7280']

function DonutChart({ data, colors, label }: { data: { name: string; value: number }[]; colors: string[]; label: string }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 mb-2">{label}</p>
      {total === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">No data yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
              {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => [`${v} (${Math.round((v / total) * 100)}%)`, '']} contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

export default function DeviceChart({ data }: { data: DeviceBreakdown }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Device & OS Breakdown</h3>
      <div className="grid grid-cols-2 gap-4">
        <DonutChart data={data.devices} colors={DEVICE_COLORS} label="Device Type" />
        <DonutChart data={data.oses}    colors={OS_COLORS}     label="Operating System" />
      </div>
    </div>
  )
}
