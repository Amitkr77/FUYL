'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Eye, Search, X } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Customer } from '@/lib/customers'

const COLORS = ['bg-violet-100 text-violet-700', 'bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700']
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?'

export function CustomersTable({ customers }: { customers: Customer[] }) {
  const [search, setSearch] = useState('')
  const [segment, setSegment] = useState('all')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const pageSize = 10
  const filtered = useMemo(() => customers.filter((customer) => {
    const term = search.trim().toLowerCase()
    const matchesSearch = !term || customer.name.toLowerCase().includes(term) || customer.email.toLowerCase().includes(term) || customer.phone.toLowerCase().includes(term)
    const matchesSegment = segment === 'all' || (segment === 'repeat' ? customer.orders > 1 : segment === 'new' ? customer.orders === 0 : customer.orders === 1)
    return matchesSearch && matchesSegment
  }).sort((a, b) => {
    if (sort === 'oldest') return new Date(a.joined).getTime() - new Date(b.joined).getTime()
    if (sort === 'spent') return b.totalSpent - a.totalSpent
    if (sort === 'orders') return b.orders - a.orders
    if (sort === 'name') return a.name.localeCompare(b.name)
    return new Date(b.joined).getTime() - new Date(a.joined).getTime()
  }), [customers, search, segment, sort])
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
    <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
      <div className="relative w-full max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input placeholder="Search name, email, or phone..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="w-full pl-9 pr-9 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#558476]/30" />{search && <button onClick={() => { setSearch(''); setPage(1) }} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X className="w-4 h-4" /></button>}</div>
      <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-slate-500 mr-1">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span><select value={segment} onChange={(e) => { setSegment(e.target.value); setPage(1) }} className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-600"><option value="all">All customers</option><option value="new">No orders yet</option><option value="single">One-time buyers</option><option value="repeat">Repeat customers</option></select><select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1) }} className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-600"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="spent">Highest spend</option><option value="orders">Most orders</option><option value="name">Name A–Z</option></select></div>
    </div>
    <div className="overflow-x-auto"><table className="w-full min-w-[760px]"><thead><tr className="border-b border-slate-100 bg-slate-50/50">{['Customer', 'Contact', 'Orders', 'Lifetime value', 'Joined', ''].map((h) => <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-50">
      {visible.length === 0 ? <tr><td colSpan={6} className="px-5 py-14 text-center"><p className="text-sm font-medium text-slate-600">No customers found</p><p className="text-xs text-slate-400 mt-1">Try another segment or search term.</p></td></tr> : visible.map((customer, index) => <tr key={customer.id} className="hover:bg-slate-50/60"><td className="px-5 py-4"><div className="flex items-center gap-3"><div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${COLORS[index % COLORS.length]}`}>{initials(customer.name)}</div><div><Link href={`/customers/${customer.id}`} className="text-sm font-semibold text-slate-900 hover:text-[#558476]">{customer.name}</Link>{customer.orders > 1 && <p className="text-[11px] text-violet-600 font-medium">Repeat customer</p>}</div></div></td><td className="px-5 py-4"><p className="text-sm text-slate-600">{customer.email}</p><p className="text-xs text-slate-400">{customer.phone || 'No phone'}</p></td><td className="px-5 py-4 text-sm text-slate-700 font-medium">{customer.orders}</td><td className="px-5 py-4 text-sm font-semibold text-slate-900">{formatCurrency(customer.totalSpent)}</td><td className="px-5 py-4 text-sm text-slate-500">{formatDate(customer.joined)}</td><td className="px-5 py-4"><Link href={`/customers/${customer.id}`} aria-label={`View ${customer.name}`} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-white"><Eye className="w-3.5 h-3.5" />View</Link></td></tr>)}
    </tbody></table></div>
    {filtered.length > pageSize && <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between"><p className="text-xs text-slate-500">Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}</p><div className="flex gap-1"><button aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="p-2 border border-slate-200 rounded-lg disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button><button aria-label="Next page" disabled={currentPage === pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))} className="p-2 border border-slate-200 rounded-lg disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button></div></div>}
  </div>
}
