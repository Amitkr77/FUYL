'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { MOCK_REVENUE_CHART } from '@/lib/mock-data'

export default function OrdersChart() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-900">Daily Orders</h3>
        <p className="text-sm text-slate-500 mt-0.5">Order volume per day</p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={MOCK_REVENUE_CHART} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(value: number) => [value, 'Orders']}
            contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
          />
          <Bar dataKey="orders" fill="#B76E79" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
