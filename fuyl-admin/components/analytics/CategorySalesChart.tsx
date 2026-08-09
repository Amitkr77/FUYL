'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import type { CategorySalesRow } from '@/lib/analytics'

const fmtRevenue = (v: number) => `₹${(v / 1000).toFixed(0)}k`

export default function CategorySalesChart({ data }: { data: CategorySalesRow[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Revenue by Category</h3>
      {data.length === 0 ? (
        <p className="text-sm text-slate-400 py-10 text-center">No category data yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmtRevenue} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={48} />
            <Tooltip
              formatter={(v: number, name: string) =>
                name === 'revenue' ? [`₹${v.toLocaleString('en-IN')}`, 'Revenue'] : [v, 'Units']
              }
              contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
            />
            <Bar dataKey="revenue" fill="#558476" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
