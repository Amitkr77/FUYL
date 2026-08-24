'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Eye, Search, X, ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { CsvExportButton } from '@/components/ui/CsvExportButton'
import { Pagination } from '@/components/ui/Pagination'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { AdminOrder, OrderStatus } from '@/lib/orders'

type TabFilter = 'all' | OrderStatus
type SortCol   = 'date' | 'total'
type SortDir   = 'asc' | 'desc'

const TABS: { label: string; value: TabFilter }[] = [
  { label: 'All', value: 'all' }, { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' }, { label: 'Packed', value: 'packed' },
  { label: 'Shipped', value: 'shipped' }, { label: 'Delivered', value: 'delivered' },
  { label: 'Completed', value: 'completed' }, { label: 'Cancelled', value: 'cancelled' },
  { label: 'Returned', value: 'returned' },
]

const VALID_TABS = TABS.map((t) => t.value)

const statusVariant = (status: OrderStatus): 'success' | 'warning' | 'danger' | 'info' | 'default' => {
  if (['completed', 'delivered'].includes(status)) return 'success'
  if (['shipped', 'confirmed', 'dispatched', 'in_transit'].includes(status)) return 'info'
  if (status === 'packed') return 'warning'
  if (['cancelled', 'returned'].includes(status)) return 'danger'
  return 'default'
}

function SortTh({ label, col, sortCol, sortDir, onSort, className }: {
  label: string; col: SortCol; sortCol: SortCol; sortDir: SortDir; onSort: (col: SortCol) => void; className?: string
}) {
  const active = sortCol === col
  return (
    <th
      onClick={() => onSort(col)}
      className={`text-left text-xs font-semibold uppercase tracking-wider px-5 py-3 cursor-pointer select-none group transition-colors ${active ? 'text-[#558476]' : 'text-slate-400 hover:text-slate-600'} ${className ?? ''}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active
          ? sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
          : <ChevronsUpDown className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />}
      </span>
    </th>
  )
}

export function OrdersTable({ orders, initialTab = 'all' }: { orders: AdminOrder[]; initialTab?: string }) {
  const validInit = VALID_TABS.includes(initialTab as TabFilter) ? initialTab as TabFilter : 'all'
  const [activeTab, setActiveTab] = useState<TabFilter>(validInit)
  const [search,    setSearch]    = useState('')
  const [sortCol,   setSortCol]   = useState<SortCol>('date')
  const [sortDir,   setSortDir]   = useState<SortDir>('desc')
  const [page,      setPage]      = useState(1)
  const pageSize = 10

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) { setSortDir((d) => d === 'desc' ? 'asc' : 'desc') }
    else { setSortCol(col); setSortDir('desc') }
    setPage(1)
  }

  const filtered = useMemo(() => orders.filter((order) => {
    const term = search.trim().toLowerCase()
    return (activeTab === 'all' || order.status === activeTab) && (!term
      || order.orderNumber.toLowerCase().includes(term)
      || order.customerName.toLowerCase().includes(term)
      || order.phone.toLowerCase().includes(term))
  }).sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    if (sortCol === 'total') return (a.total - b.total) * dir
    return (new Date(a.date).getTime() - new Date(b.date).getTime()) * dir
  }), [orders, activeTab, search, sortCol, sortDir])

  const pageCount   = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const visible     = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const tabCount    = (tab: TabFilter) => tab === 'all' ? orders.length : orders.filter((o) => o.status === tab).length

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Status tabs */}
      <div className="flex items-center gap-1 px-4 pt-4 border-b border-slate-100 overflow-x-auto scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setActiveTab(tab.value); setPage(1) }}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px whitespace-nowrap transition-colors ${
              activeTab === tab.value ? 'text-[#558476] border-[#558476]' : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.value ? 'bg-[#558476]/10 text-[#558476]' : 'bg-slate-100 text-slate-400'}`}>
              {tabCount(tab.value)}
            </span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            placeholder="Search order, customer, or phone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-9 pr-9 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#558476]/30"
          />
          {search && (
            <button onClick={() => { setSearch(''); setPage(1) }} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <span className="text-xs text-slate-500 whitespace-nowrap">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Order #</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Customer</th>
              <SortTh label="Date"  col="date"  sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} />
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Items</th>
              <SortTh label="Total" col="total" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} />
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-14 text-center">
                  <p className="text-sm font-medium text-slate-600">No orders found</p>
                  <p className="text-xs text-slate-400 mt-1">Try another status or search term.</p>
                </td>
              </tr>
            ) : visible.map((order) => (
              <tr key={order.id} className="hover:bg-slate-50/60">
                <td className="px-5 py-4 text-sm font-semibold text-slate-900">{order.orderNumber}</td>
                <td className="px-5 py-4">
                  <Link href={`/customers/${order.customerId}`} className="text-sm font-medium text-slate-900 hover:text-[#558476]">{order.customerName}</Link>
                  <p className="text-xs text-slate-400">{order.phone || 'No phone'}</p>
                </td>
                <td className="px-5 py-4 text-sm text-slate-500 whitespace-nowrap">{formatDateTime(order.date)}</td>
                <td className="px-5 py-4 text-sm text-slate-500">{order.itemCount} item{order.itemCount !== 1 ? 's' : ''}</td>
                <td className="px-5 py-4 text-sm font-semibold text-slate-900">{formatCurrency(order.total)}</td>
                <td className="px-5 py-4"><Badge variant={statusVariant(order.status)}>{order.status.replace('_', ' ').replace(/^./, (c) => c.toUpperCase())}</Badge></td>
                <td className="px-5 py-4">
                  <Link href={`/orders/${order.id}`} aria-label={`View order ${order.orderNumber}`} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-white">
                    <Eye className="w-3.5 h-3.5" />View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={currentPage} pageCount={pageCount} total={filtered.length} pageSize={pageSize} onPage={setPage} />
    </div>
  )
}

export function ExportButton({ orders }: { orders: AdminOrder[] }) {
  return (
    <CsvExportButton
      filename="orders"
      dateKey="date"
      columns={[
        { key: 'orderNumber', label: 'Order #' },
        { key: 'customerName', label: 'Customer' },
        { key: 'phone', label: 'Phone' },
        { key: 'date', label: 'Date' },
        { key: 'itemCount', label: 'Items' },
        { key: 'total', label: 'Total (₹)' },
        { key: 'status', label: 'Status' },
      ]}
      rows={orders}
    />
  )
}
