'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Download, Eye, Search, X } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { AdminOrder, OrderStatus } from '@/lib/orders'

type TabFilter = 'all' | OrderStatus
const TABS: { label: string; value: TabFilter }[] = [
  { label: 'All', value: 'all' }, { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' }, { label: 'Packed', value: 'packed' },
  { label: 'Shipped', value: 'shipped' }, { label: 'Delivered', value: 'delivered' },
  { label: 'Completed', value: 'completed' }, { label: 'Cancelled', value: 'cancelled' },
  { label: 'Returned', value: 'returned' },
]

const statusVariant = (status: OrderStatus): 'success' | 'warning' | 'danger' | 'info' | 'default' => {
  if (['completed', 'delivered'].includes(status)) return 'success'
  if (['shipped', 'confirmed', 'dispatched', 'in_transit'].includes(status)) return 'info'
  if (status === 'packed') return 'warning'
  if (['cancelled', 'returned'].includes(status)) return 'danger'
  return 'default'
}

export function OrdersTable({ orders }: { orders: AdminOrder[] }) {
  const [activeTab, setActiveTab] = useState<TabFilter>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const pageSize = 10
  const filtered = useMemo(() => orders.filter((order) => {
    const term = search.trim().toLowerCase()
    return (activeTab === 'all' || order.status === activeTab) && (!term
      || order.orderNumber.toLowerCase().includes(term)
      || order.customerName.toLowerCase().includes(term)
      || order.phone.toLowerCase().includes(term))
  }).sort((a, b) => {
    if (sort === 'oldest') return new Date(a.date).getTime() - new Date(b.date).getTime()
    if (sort === 'highest') return b.total - a.total
    if (sort === 'lowest') return a.total - b.total
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  }), [orders, activeTab, search, sort])
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const tabCount = (tab: TabFilter) => tab === 'all' ? orders.length : orders.filter((o) => o.status === tab).length

  return <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
    <div className="flex items-center gap-1 px-4 pt-4 border-b border-slate-100 overflow-x-auto scrollbar-hide">
      {TABS.map((tab) => <button key={tab.value} onClick={() => { setActiveTab(tab.value); setPage(1) }} className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px whitespace-nowrap ${activeTab === tab.value ? 'text-[#558476] border-[#558476]' : 'text-slate-500 border-transparent hover:text-slate-700'}`}>{tab.label}<span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.value ? 'bg-[#558476]/10 text-[#558476]' : 'bg-slate-100 text-slate-400'}`}>{tabCount(tab.value)}</span></button>)}
    </div>
    <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
      <div className="relative w-full max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input placeholder="Search order, customer, or phone..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="w-full pl-9 pr-9 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#558476]/30" />{search && <button onClick={() => { setSearch(''); setPage(1) }} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X className="w-4 h-4" /></button>}</div>
      <div className="flex items-center gap-3"><span className="text-xs text-slate-500 whitespace-nowrap">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span><select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1) }} className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-600"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="highest">Highest value</option><option value="lowest">Lowest value</option></select></div>
    </div>
    <div className="overflow-x-auto"><table className="w-full min-w-[760px]"><thead><tr className="border-b border-slate-100 bg-slate-50/50">{['Order #', 'Customer', 'Date', 'Items', 'Total', 'Status', ''].map((h) => <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-50">
      {visible.length === 0 ? <tr><td colSpan={7} className="px-5 py-14 text-center"><p className="text-sm font-medium text-slate-600">No orders found</p><p className="text-xs text-slate-400 mt-1">Try another status or search term.</p></td></tr> : visible.map((order) => <tr key={order.id} className="hover:bg-slate-50/60"><td className="px-5 py-4 text-sm font-semibold text-slate-900">{order.orderNumber}</td><td className="px-5 py-4"><Link href={`/customers/${order.customerId}`} className="text-sm font-medium text-slate-900 hover:text-[#558476]">{order.customerName}</Link><p className="text-xs text-slate-400">{order.phone || 'No phone'}</p></td><td className="px-5 py-4 text-sm text-slate-500">{formatDate(order.date)}</td><td className="px-5 py-4 text-sm text-slate-500">{order.itemCount} item{order.itemCount !== 1 ? 's' : ''}</td><td className="px-5 py-4 text-sm font-semibold text-slate-900">{formatCurrency(order.total)}</td><td className="px-5 py-4"><Badge variant={statusVariant(order.status)}>{order.status.replace('_', ' ').replace(/^./, (c) => c.toUpperCase())}</Badge></td><td className="px-5 py-4"><Link href={`/orders/${order.id}`} aria-label={`View order ${order.orderNumber}`} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-white"><Eye className="w-3.5 h-3.5" />View</Link></td></tr>)}
    </tbody></table></div>
    {filtered.length > pageSize && <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between"><p className="text-xs text-slate-500">Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}</p><div className="flex gap-1"><button aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="p-2 border border-slate-200 rounded-lg disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button><button aria-label="Next page" disabled={currentPage === pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))} className="p-2 border border-slate-200 rounded-lg disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button></div></div>}
  </div>
}

export function ExportButton({ orders }: { orders: AdminOrder[] }) {
  const exportCsv = () => {
    const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`
    const rows = [['Order number', 'Customer', 'Phone', 'Date', 'Items', 'Total', 'Status'], ...orders.map((o) => [o.orderNumber, o.customerName, o.phone, o.date, o.itemCount, o.total, o.status])]
    const url = URL.createObjectURL(new Blob([rows.map((row) => row.map(escape).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url)
  }
  return <button onClick={exportCsv} disabled={!orders.length} className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"><Download className="w-4 h-4" />Export CSV</button>
}
