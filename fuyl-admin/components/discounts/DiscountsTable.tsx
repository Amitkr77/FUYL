'use client'

import { useMemo, useState, useTransition } from 'react'
import { Search, Trash2 } from 'lucide-react'
import { Pencil } from 'lucide-react'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import type { Discount, DiscountStatus } from '@/lib/discounts'
import { updateDiscountStatusAction, deleteDiscountAction } from '@/app/(admin)/discounts-cashback/actions'

const statuses: DiscountStatus[] = ['draft', 'active', 'paused', 'ended']

function effectiveStatus(discount: Discount): string {
  const now = Date.now()
  if (discount.status === 'draft') return 'Draft'
  if (discount.status === 'paused' || !discount.isActive) return 'Paused'
  if (discount.endsAt && new Date(discount.endsAt).getTime() < now) return 'Expired'
  if (new Date(discount.startsAt).getTime() > now) return 'Scheduled'
  return discount.status === 'ended' ? 'Expired' : 'Active'
}

function summary(discount: Discount): string {
  const coupon = discount.coupons[0]
  if (!coupon) return discount.type.replace('_', ' ')
  if (coupon.discountType === 'free_shipping') return 'Free shipping'
  if (coupon.discountType === 'buy_x_get_y') return `Buy ${coupon.buyQuantity ?? 1}, get ${coupon.getQuantity ?? 1} at ${coupon.discountValue}% off`
  const value = coupon.discountType === 'percent' ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`
  return `${value} off ${coupon.scope === 'cart' ? 'order' : coupon.scope}`
}

export function DiscountsTable({ discounts }: { discounts: Discount[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const visible = useMemo(() => discounts.filter((discount) => {
    const status = effectiveStatus(discount).toLowerCase()
    return (filter === 'all' || status === filter) &&
      `${discount.name} ${discount.coupons.map((c) => c.code).join(' ')}`.toLowerCase().includes(query.toLowerCase())
  }), [discounts, filter, query])

  const updateStatus = (id: string, status: DiscountStatus) => startTransition(async () => {
    const result = await updateDiscountStatusAction(id, status)
    if ('error' in result) setError(result.error)
  })

  const remove = (id: string, name: string) => {
    if (!confirm(`Delete discount “${name}”? This cannot be undone.`)) return
    startTransition(async () => {
      const result = await deleteDiscountAction(id)
      if ('error' in result) setError(result.error)
    })
  }

  return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
      <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
        <option value="all">All</option><option value="active">Active</option><option value="scheduled">Scheduled</option>
        <option value="draft">Draft</option><option value="paused">Paused</option><option value="expired">Expired</option>
      </select>
      <label className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
        <Search className="h-4 w-4 text-slate-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search and filter" className="w-full bg-transparent text-sm outline-none" />
      </label>
    </div>
    {error && <p className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
    <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm">
      <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500"><tr>
        <th className="px-4 py-3">Title</th><th>Status</th><th>Method</th><th>Eligibility</th><th>Type</th><th>Used</th><th />
      </tr></thead>
      <tbody className="divide-y divide-slate-100">{visible.length === 0 ? <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">No discounts found.</td></tr> : visible.map((discount) => {
        const status = effectiveStatus(discount)
        const used = discount.coupons.reduce((sum, coupon) => sum + (coupon.redemptionsCount ?? 0), 0)
        return <tr key={discount.id} className="hover:bg-slate-50/70">
          <td className="px-4 py-4"><p className="font-semibold text-slate-900">{discount.name}</p><p className="text-xs text-slate-500">{summary(discount)}</p></td>
          <td><Badge variant={status === 'Active' ? 'success' : status === 'Expired' ? 'danger' : status === 'Scheduled' ? 'info' : 'default'}>{status}</Badge></td>
          <td>{discount.type === 'automatic' ? 'Automatic' : 'Code'}</td><td>All customers</td><td className="capitalize">{summary(discount)}</td><td>{used}</td>
          <td className="pr-4 text-right"><select value={discount.status} disabled={pending} onChange={(e) => updateStatus(discount.id, e.target.value as DiscountStatus)} className="mr-2 rounded border border-slate-200 px-2 py-1 text-xs">{statuses.map((s) => <option key={s}>{s}</option>)}</select><Link href={`/discounts-cashback/discounts/${discount.id}/edit`} className="mr-2 inline-flex text-slate-400 hover:text-[#315f52]" aria-label={`Edit ${discount.name}`}><Pencil className="h-4 w-4" /></Link><button onClick={() => remove(discount.id, discount.name)} disabled={pending} className="text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></td>
        </tr>
      })}</tbody>
    </table></div>
  </div>
}
