'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import type { Referral, ReferralStatus } from '@/lib/referrals'

const STATUS_VARIANT: Record<ReferralStatus, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  shared: 'default', applied: 'info', pending: 'info', eligible: 'warning',
  rewarded: 'success', completed: 'success', rejected: 'danger',
}

export function ReferralsTable({ referrals }: { referrals: Referral[] }) {
  const [search, setSearch] = useState('')

  const filtered = referrals.filter((r) =>
    !search || r.code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="p-4 border-b border-slate-100">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Code</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Referrer</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Referee</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Shared</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400 text-sm">No referrals found.</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4 text-sm font-mono font-medium text-slate-900">{r.code}</td>
                  <td className="px-5 py-4 text-sm text-slate-500 hidden md:table-cell font-mono">{r.referrerId.slice(-8)}</td>
                  <td className="px-5 py-4 text-sm text-slate-500 hidden md:table-cell font-mono">{r.refereeId.slice(-8)}</td>
                  <td className="px-5 py-4"><Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge></td>
                  <td className="px-5 py-4 text-sm text-slate-500">{formatDate(r.sharedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
