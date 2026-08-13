import Link from 'next/link'
import { Plus, AlertCircle } from 'lucide-react'
import { DiscountsTable } from '@/components/discounts/DiscountsTable'
import { PoliciesTable } from '@/components/cashback/PoliciesTable'
import { EarningsTable } from '@/components/cashback/EarningsTable'
import { listDiscounts } from '@/lib/discounts'
import { listCashbackPolicies, listCashbackEarnings } from '@/lib/cashback'
import { getErrorMessage } from '@/lib/api'

export default async function DiscountCashbackPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = 'discounts' } = await searchParams
  let discounts: Awaited<ReturnType<typeof listDiscounts>> = []
  let policies: Awaited<ReturnType<typeof listCashbackPolicies>> = []
  let earnings: Awaited<ReturnType<typeof listCashbackEarnings>> = { items: [], total: 0 }
  let error = ''
  try {
    if (tab === 'discounts') discounts = await listDiscounts()
    else [policies, earnings] = await Promise.all([listCashbackPolicies(), listCashbackEarnings({ limit: 50 })])
  } catch (err) { error = getErrorMessage(err, 'Could not load discount and cashback data.') }
  const tabs = [{ id: 'discounts', label: 'Discounts' }, { id: 'cashback', label: 'Cashback' }, { id: 'activity', label: 'Activity' }]
  return <div className="space-y-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold text-slate-900">Discount &amp; Cashback</h1><p className="mt-1 text-sm text-slate-500">Manage customer savings and wallet rewards in one place.</p></div>
      {tab !== 'activity' && <Link href={tab === 'cashback' ? '/discounts-cashback/cashback/new' : '/discounts-cashback/discounts/new'} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#12291F] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#234c3a]"><Plus className="h-4 w-4" />{tab === 'cashback' ? 'Create cashback' : 'Create discount'}</Link>}
    </div>
    <nav className="flex gap-1 border-b border-slate-200">{tabs.map((item) => <Link key={item.id} href={`/discounts-cashback?tab=${item.id}`} className={`border-b-2 px-4 py-2.5 text-sm font-medium ${tab === item.id ? 'border-[#558476] text-[#315f52]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{item.label}</Link>)}</nav>
    {error && <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600"><AlertCircle className="h-4 w-4" />{error}</div>}
    {tab === 'discounts' && <DiscountsTable discounts={discounts} />}
    {tab === 'cashback' && <PoliciesTable policies={policies} />}
    {tab === 'activity' && <EarningsTable earnings={earnings.items} total={earnings.total} />}
  </div>
}
