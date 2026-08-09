'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import type { OrdersByStatusRow } from '@/lib/analytics'
import { ORDER_STATUS_LABEL } from '@/lib/orderStatus'

const STATUS_COLOR: Record<string, string> = {
  pending:    '#94a3b8',
  confirmed:  '#60a5fa',
  packed:     '#a78bfa',
  dispatched: '#f59e0b',
  in_transit: '#fb923c',
  shipped:    '#f97316',
  delivered:  '#34d399',
  completed:  '#10b981',
  cancelled:  '#f87171',
  returned:   '#fb7185',
}

export default function OrdersByStatusChart({ data }: { data: OrdersByStatusRow[] }) {
  const chartData = data.map((d) => ({
    ...d,
    label: ORDER_STATUS_LABEL[d.status as keyof typeof ORDER_STATUS_LABEL] ?? d.status,
  }))

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Orders by Status</h3>
      {chartData.length === 0 ? (
        <p className="text-sm text-slate-400 py-10 text-center">No order data yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={32} />
            <Tooltip
              formatter={(v: number) => [v, 'Orders']}
              contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry) => (
                <Cell key={entry.status} fill={STATUS_COLOR[entry.status] ?? '#558476'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
