'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { MOCK_REVENUE_CHART } from '@/lib/mock-data'

const formatRevenue = (value: number) => `₹${(value / 1000).toFixed(0)}k`

export default function AnalyticsRevenueChart() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-900">Revenue Trend</h3>
        <p className="text-sm text-slate-500 mt-0.5">Daily revenue for the past 7 days</p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={MOCK_REVENUE_CHART} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={formatRevenue} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={50} />
          <Tooltip
            formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
            contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
          />
          <Line type="monotone" dataKey="revenue" stroke="#558476" strokeWidth={2.5} dot={{ fill: '#558476', r: 4 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
