import { CalendarDays, HeartHandshake, Users } from 'lucide-react'
import { PrebookingTable } from '@/components/prebookings/PrebookingTable'
import { getPrebookingStats, listPrebookingLeads } from '@/lib/prebookings'
import { getErrorMessage } from '@/lib/api'

export default async function PrebookingsPage() {
  let leads: Awaited<ReturnType<typeof listPrebookingLeads>> = []
  let stats = { total: 0, today: 0, capacity: 500, remaining: 500, donationInterested: 0 }
  let error = ''
  try { [leads, stats] = await Promise.all([listPrebookingLeads(), getPrebookingStats()]) }
  catch (err) { error = getErrorMessage(err, 'Could not load pre-booking leads.') }
  return <div className="space-y-6">
    <div><h2 className="text-xl font-bold text-slate-900">Pre-booking Leads</h2><p className="mt-0.5 text-sm text-slate-500">Customers who joined through the storefront pre-booking popup</p></div>
    <div className="grid gap-3 sm:grid-cols-3"><div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><Users className="h-5 w-5 text-[#558476]" /><div><p className="text-2xl font-bold text-slate-900">{stats.total} <span className="text-base font-medium text-slate-400">/ {stats.capacity}</span></p><p className="text-xs text-slate-500">Places claimed · {stats.remaining} remaining</p></div></div><div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><CalendarDays className="h-5 w-5 text-[#558476]" /><div><p className="text-2xl font-bold text-slate-900">{stats.today}</p><p className="text-xs text-slate-500">Submitted today</p></div></div><div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><HeartHandshake className="h-5 w-5 text-[#558476]" /><div><p className="text-2xl font-bold text-slate-900">{stats.donationInterested}</p><p className="text-xs text-slate-500">Donation interest</p></div></div></div>
    {error && <p className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">{error}</p>}
    <PrebookingTable leads={leads} />
  </div>
}
