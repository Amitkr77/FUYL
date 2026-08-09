'use client'

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import type { CustomerSegments } from '@/lib/analytics'

export default function RepeatVsNewChart({ data }: { data: CustomerSegments }) {
  const chartData = [
    { name: 'New Customers',    value: data.newCustomers },
    { name: 'Repeat Customers', value: data.repeatCustomers },
  ]
  const total = data.newCustomers + data.repeatCustomers

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">New vs Repeat Customers</h3>
      {total === 0 ? (
        <p className="text-sm text-slate-400 py-10 text-center">No customer data yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
              <Cell fill="#558476" />
              <Cell fill="#60a5fa" />
            </Pie>
            <Tooltip
              formatter={(v: number) => [`${v} (${total > 0 ? Math.round((v / total) * 100) : 0}%)`, '']}
              contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
