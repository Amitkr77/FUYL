'use client'

import { useState, useTransition } from 'react'
import { Lock, Unlock, IndianRupee } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { WalletBalance, WalletTransaction } from '@/lib/wallet'
import { adjustWalletAction, setWalletFrozenAction } from '@/app/(admin)/wallet/actions'

const TX_VARIANT: Record<WalletTransaction['type'], 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  credit: 'success', debit: 'danger', hold: 'warning', release: 'info', reverse: 'default',
}

export function WalletManager({
  userId,
  balance,
  transactions,
}: {
  userId: string
  balance: WalletBalance
  transactions: WalletTransaction[]
}) {
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'credit' | 'debit'>('credit')
  const [description, setDescription] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const handleAdjust = () => {
    setError('')
    const n = Number(amount)
    if (!n || n <= 0) {
      setError('Enter a positive amount.')
      return
    }
    if (!description.trim()) {
      setError('A description is required.')
      return
    }
    startTransition(async () => {
      const result = await adjustWalletAction({ userId, amount: n, type, description })
      if ('error' in result) {
        setError(result.error)
        return
      }
      setAmount('')
      setDescription('')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  const handleToggleFreeze = () => {
    startTransition(async () => {
      const result = await setWalletFrozenAction(userId, !balance.isFrozen)
      if ('error' in result) setError(result.error)
    })
  }

  return (
    <div className="space-y-5">
      {/* Balance cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Balance" value={formatCurrency(balance.balance)} />
        <StatCard label="Held" value={formatCurrency(balance.heldBalance)} />
        <StatCard label="Pending" value={formatCurrency(balance.pendingBalance)} />
        <StatCard label="Loyalty Points" value={String(balance.loyaltyPoints)} />
      </div>

      {balance.isFrozen && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 text-amber-700 text-sm flex items-center gap-2">
          <Lock className="w-4 h-4" /> This wallet is frozen — credits/debits are blocked until unfrozen.
        </div>
      )}

      {/* Adjust panel */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">Adjust Balance</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Amount</label>
            <div className="relative">
              <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-32 pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#558476]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'credit' | 'debit')}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#558476]"
            >
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Reason for this adjustment"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#558476]"
            />
          </div>
          <button
            onClick={handleAdjust}
            disabled={isPending || balance.isFrozen}
            className="px-4 py-2 bg-[#558476] hover:bg-[#457366] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {saved ? 'Applied!' : isPending ? 'Saving…' : 'Apply'}
          </button>
          <button
            onClick={handleToggleFreeze}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {balance.isFrozen ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            {balance.isFrozen ? 'Unfreeze' : 'Freeze'}
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
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Amount</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Description</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Balance After</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {transactions.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400 text-sm">No transactions yet.</td></tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4"><Badge variant={TX_VARIANT[t.type]}>{t.type}</Badge></td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-900">{formatCurrency(t.amount)}</td>
                    <td className="px-5 py-4 text-sm text-slate-500 hidden md:table-cell">{t.description}</td>
                    <td className="px-5 py-4 text-sm text-slate-500 hidden lg:table-cell">{formatCurrency(t.balanceAfter)}</td>
                    <td className="px-5 py-4 text-sm text-slate-500">{formatDate(t.createdAt)}</td>
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
