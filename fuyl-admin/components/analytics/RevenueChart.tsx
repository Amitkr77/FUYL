'use client'

import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import type { ChartPoint } from '@/lib/analytics'

const fmtRevenue = (v: number) => `₹${(v / 1000).toFixed(0)}k`

export default function RevenueChart({ data }: { data: ChartPoint[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Revenue & Orders</h3>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="rev" tickFormatter={fmtRevenue} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={48} />
          <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={32} />
          <Tooltip
            formatter={(value: number, name: string) =>
              name === 'revenue' ? [`₹${value.toLocaleString('en-IN')}`, 'Revenue'] : [value, 'Orders']
            }
            contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="ord" dataKey="orders" name="Orders" fill="#c7d7d3" radius={[3, 3, 0, 0]} />
          <Line yAxisId="rev" type="monotone" dataKey="revenue" name="Revenue" stroke="#558476" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
