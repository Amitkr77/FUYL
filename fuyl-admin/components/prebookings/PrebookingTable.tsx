'use client'

import { useMemo, useState } from 'react'
import { Download, Search } from 'lucide-react'
import { Pagination } from '@/components/ui/Pagination'
import { formatDateTime } from '@/lib/utils'
import type { PrebookingLead } from '@/lib/prebookings'

const PAGE_SIZE = 20
export function PrebookingTable({ leads }: { leads: PrebookingLead[] }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return query ? leads.filter((lead) => [lead.name, lead.email, lead.phone].some((value) => value.toLowerCase().includes(query))) : leads
  }, [leads, search])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  const exportCsv = () => {
    const esc = (value: string) => `"${value.replace(/"/g, '""')}"`
    const csv = [['Name', 'Email', 'Phone', 'Donation interest', 'Source', 'Submitted'], ...filtered.map((lead) => [lead.name, lead.email, lead.phone, lead.wantsToDonate ? 'Yes' : 'No', lead.source, new Date(lead.submittedAt).toISOString()])].map((row) => row.map(esc).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = `prebooking-leads-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url)
  }

  return <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
      <div className="relative max-w-sm flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Search name, email or phone…" className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#558476]" /></div>
      <button onClick={exportCsv} disabled={!filtered.length} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 sm:ml-auto"><Download className="h-4 w-4" />Export CSV</button>
    </div>
    <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"><th className="px-5 py-3">Name</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Phone</th><th className="px-5 py-3">Donation</th><th className="hidden px-5 py-3 md:table-cell">Source</th><th className="px-5 py-3">Submitted</th></tr></thead><tbody className="divide-y divide-slate-50">{rows.length ? rows.map((lead) => <tr key={lead.id} className="hover:bg-slate-50/60"><td className="px-5 py-4 text-sm font-medium text-slate-900">{lead.name}</td><td className="px-5 py-4 text-sm text-slate-600"><a href={`mailto:${lead.email}`} className="hover:text-[#558476]">{lead.email}</a></td><td className="px-5 py-4 text-sm text-slate-600"><a href={`tel:${lead.phone}`} className="hover:text-[#558476]">{lead.phone}</a></td><td className="px-5 py-4 text-sm"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${lead.wantsToDonate ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{lead.wantsToDonate ? 'Interested' : 'No'}</span></td><td className="hidden px-5 py-4 text-sm text-slate-500 md:table-cell">{lead.source}</td><td className="px-5 py-4 text-sm text-slate-500">{formatDateTime(lead.submittedAt)}</td></tr>) : <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400">No pre-booking leads found.</td></tr>}</tbody></table></div>
    <Pagination page={current} pageCount={pageCount} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
  </div>
}
