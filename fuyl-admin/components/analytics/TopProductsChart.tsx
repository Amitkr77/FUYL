'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import type { TopProduct } from '@/lib/analytics'

const fmtRevenue = (v: number) => `₹${(v / 1000).toFixed(0)}k`

export default function TopProductsChart({ data }: { data: TopProduct[] }) {
  const chartData = data.slice(0, 8).map((p) => ({ ...p, name: p.name.length > 20 ? p.name.slice(0, 20) + '…' : p.name }))

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Top Products by Revenue</h3>
      {chartData.length === 0 ? (
        <p className="text-sm text-slate-400 py-10 text-center">No sales data yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis type="number" tickFormatter={fmtRevenue} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={120} />
            <Tooltip
              formatter={(v: number, name: string) =>
                name === 'revenue' ? [`₹${v.toLocaleString('en-IN')}`, 'Revenue'] : [v, 'Units sold']
              }
              contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
            />
            <Bar dataKey="revenue" fill="#558476" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
