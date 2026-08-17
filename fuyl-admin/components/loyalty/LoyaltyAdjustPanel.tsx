'use client'

import { useState, useTransition } from 'react'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import type { LoyaltyAccount, LoyaltyTransaction, LoyaltyTxType } from '@/lib/loyalty'
import { adjustLoyaltyPointsAction } from '@/app/(admin)/loyalty/actions'

const TX_VARIANT: Record<LoyaltyTxType, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  earn:    'success',
  redeem:  'warning',
  reverse: 'info',
  expire:  'danger',
  adjust:  'default',
}

export function LoyaltyAdjustPanel({
  userId,
  account,
  transactions,
}: {
  userId: string
  account: LoyaltyAccount
  transactions: LoyaltyTransaction[]
}) {

  const [points, setPoints] = useState('')
  const [description, setDescription] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const handleAdjust = () => {
    setError('')
    const n = parseInt(points, 10)
    if (!n || n === 0)          { setError('Enter a non-zero integer (positive to add, negative to deduct).'); return }
    if (!description.trim())    { setError('A reason is required.'); return }
    startTransition(async () => {
      const result = await adjustLoyaltyPointsAction({ userId, points: n, description })
      if (result.error) { setError(result.error); return }
      setPoints('')
      setDescription('')
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  return (
    <div className="space-y-5">
      {/* Balance summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Current Balance" value={`${account.balance.toLocaleString('en-IN')} pts`} />
        <StatCard label="Lifetime Earned" value={`${account.lifetimeEarned.toLocaleString('en-IN')} pts`} />
        <StatCard label="Lifetime Redeemed" value={`${account.lifetimeRedeemed.toLocaleString('en-IN')} pts`} />
      </div>

      {/* Manual adjust form */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Adjust Points</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Use a positive number to add points, negative to deduct (e.g. +500 or -200).
            Every adjustment is recorded in the transaction history below.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Points</label>
            <input
              type="number"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="+500 or -200"
              className="w-36 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#558476]"
            />
          </div>
          <div className="flex-1 min-w-[240px]">
            <label className="block text-xs font-medium text-slate-500 mb-1">Reason (required)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Reason for this manual adjustment"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#558476]"
            />
          </div>
          <button
            onClick={handleAdjust}
            disabled={isPending}
            className="px-4 py-2 bg-[#558476] hover:bg-[#457366] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {saved ? 'Applied!' : isPending ? 'Saving…' : 'Apply'}
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      {/* Transaction history */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Transaction History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Type</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Points</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Description</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Balance After</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-400 text-sm">
                    No transactions yet for this customer.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <Badge variant={TX_VARIANT[t.type]}>{t.type}</Badge>
                    </td>
                    <td className={`px-5 py-4 text-sm font-semibold ${t.points > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {t.points > 0 ? '+' : ''}{t.points.toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500 hidden md:table-cell max-w-xs truncate">
                      {t.description}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500 hidden lg:table-cell">
                      {t.balanceAfter.toLocaleString('en-IN')} pts
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500">
                      {formatDate(t.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold text-slate-900 mt-1">{value}</p>
    </div>
  )
}
