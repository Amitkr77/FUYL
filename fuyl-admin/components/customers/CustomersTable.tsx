'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Eye } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Customer } from '@/lib/customers'

const AVATAR_COLORS = [
  'bg-violet-100 text-violet-700',
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-indigo-100 text-indigo-700',
]

const getInitials = (name: string) =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase()

export function CustomersTable({ customers }: { customers: Customer[] }) {
  const [search, setSearch] = useState('')

  const filtered = customers.filter((c) =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      {/* Search */}
      <div className="p-4 border-b border-slate-100">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers..."
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
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Customer</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Email</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Orders</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Total Spent</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Joined</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-sm">No customers found.</td>
              </tr>
            ) : (
              filtered.map((customer, i) => (
                <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                          AVATAR_COLORS[i % AVATAR_COLORS.length]
                        }`}
                      >
                        {getInitials(customer.name)}
                      </div>
                      <span className="text-sm font-medium text-slate-900">{customer.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500 hidden md:table-cell">{customer.email}</td>
                  <td className="px-5 py-4 text-sm text-slate-700 font-medium">{customer.orders}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-slate-900">{formatCurrency(customer.totalSpent)}</td>
                  <td className="px-5 py-4 text-sm text-slate-500 hidden lg:table-cell">{formatDate(customer.joined)}</td>
                  <td className="px-5 py-4">
                    <Link
                      href={`/customers/${customer.id}`}
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
  )
}
