'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Download, Eye } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { MOCK_ORDERS, OrderStatus, Order } from '@/lib/mock-data'
import { formatCurrency, formatDate } from '@/lib/utils'

type TabFilter = 'all' | OrderStatus

const TABS: { label: string; value: TabFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Processing', value: 'processing' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
]

const statusVariant = (status: OrderStatus): 'success' | 'warning' | 'danger' | 'info' | 'default' => {
  switch (status) {
    case 'delivered': return 'success'
    case 'shipped': return 'info'
    case 'processing': return 'warning'
    case 'pending': return 'default'
    case 'cancelled': return 'danger'
  }
}

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<TabFilter>('all')
  const [search, setSearch] = useState('')

  const filtered = MOCK_ORDERS.filter((o: Order) => {
    const matchTab = activeTab === 'all' || o.status === activeTab
    const matchSearch =
      !search ||
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.toLowerCase().includes(search.toLowerCase()) ||
      o.email.toLowerCase().includes(search.toLowerCase())
    return matchTab && matchSearch
  })

  const tabCount = (tab: TabFilter) =>
    tab === 'all'
      ? MOCK_ORDERS.length
      : MOCK_ORDERS.filter((o: Order) => o.status === tab).length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Orders</h2>
          <p className="text-sm text-slate-500 mt-0.5">{MOCK_ORDERS.length} total orders</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 pt-4 border-b border-slate-100 overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px whitespace-nowrap ${
                activeTab === tab.value
                  ? 'text-[#558476] border-[#558476]'
                  : 'text-slate-500 border-transparent hover:text-slate-700'
              }`}
            >
              {tab.label}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.value
                    ? 'bg-[#558476]/10 text-[#558476]'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {tabCount(tab.value)}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search orders, customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Order #</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Customer</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Date</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Items</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Total</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400 text-sm">No orders found.</td>
                </tr>
              ) : (
                filtered.map((order: Order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 text-sm font-semibold text-slate-900">{order.id}</td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-slate-900">{order.customer}</p>
                      <p className="text-xs text-slate-400">{order.email}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500 hidden md:table-cell">{formatDate(order.date)}</td>
                    <td className="px-5 py-4 text-sm text-slate-500 hidden lg:table-cell">{order.items} item{order.items !== 1 ? 's' : ''}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-900">{formatCurrency(order.total)}</td>
                    <td className="px-5 py-4">
                      <Badge variant={statusVariant(order.status)}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/orders/${order.id}`}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
