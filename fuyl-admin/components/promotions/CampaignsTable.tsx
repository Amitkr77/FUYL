'use client'

import { useState, useTransition } from 'react'
import { Star, Trash2 } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import type { Campaign, CampaignStatus } from '@/lib/promotions'
import { updateCampaignStatusAction, toggleFeaturedAction, deleteCampaignAction } from '@/app/(admin)/promotions/actions'

const STATUS_VARIANT: Record<CampaignStatus, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  active: 'success', draft: 'default', paused: 'warning', ended: 'danger',
}

const STATUS_OPTIONS: CampaignStatus[] = ['draft', 'active', 'paused', 'ended']

export function CampaignsTable({ campaigns }: { campaigns: Campaign[] }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const handleStatusChange = (id: string, status: CampaignStatus) => {
    setError('')
    startTransition(async () => {
      const result = await updateCampaignStatusAction(id, status)
      if ('error' in result) setError(result.error)
    })
  }

  const handleToggleFeatured = (id: string, next: boolean) => {
    startTransition(async () => {
      const result = await toggleFeaturedAction(id, next)
      if ('error' in result) setError(result.error)
    })
  }

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete campaign "${name}"? This cannot be undone.`)) return
    startTransition(async () => {
      const result = await deleteCampaignAction(id)
      if ('error' in result) setError(result.error)
    })
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      {error && (
        <div className="p-3 border-b border-red-100 bg-red-50 text-red-600 text-sm">{error}</div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Campaign</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Coupons</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Dates</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {campaigns.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400 text-sm">No campaigns yet.</td></tr>
            ) : (
              campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleToggleFeatured(c.id, !c.isFeatured)} disabled={isPending}>
                        <Star className={`w-4 h-4 ${c.isFeatured ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                      </button>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{c.name}</p>
                        <p className="text-xs text-slate-500 capitalize">{c.type.replace('_', ' ')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-700">
                    {c.coupons.length === 0 ? '—' : c.coupons.map((co) => co.code).join(', ')}
                  </td>
                  <td className="px-5 py-4">
                    <select
                      value={c.status}
                      onChange={(e) => handleStatusChange(c.id, e.target.value as CampaignStatus)}
                      disabled={isPending}
                      className="text-xs font-medium border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-[#558476]"
                    >
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <Badge variant={STATUS_VARIANT[c.status]} className="ml-2">{c.status}</Badge>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500 hidden md:table-cell">
                    {formatDate(c.startsAt)}{c.endsAt ? ` – ${formatDate(c.endsAt)}` : ' – ongoing'}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => handleDelete(c.id, c.name)}
                      disabled={isPending}
                      className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
