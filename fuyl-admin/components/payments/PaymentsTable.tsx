'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  Search, X, ChevronDown, CreditCard, Wallet, Truck,
  AlertCircle, PackageOpen, RefreshCcw, CheckCircle2,
} from 'lucide-react'
import Badge from '@/components/ui/Badge'
import type { Payment, PaymentStatus } from '@/lib/payments'
import { refundPaymentAction } from '@/app/(admin)/payments/actions'

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2,
  }).format(amount / 100)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

const STATUS_CONFIG: Record<PaymentStatus, { label: string; variant: 'success' | 'danger' | 'warning' | 'default' | 'info' }> = {
  success:             { label: 'Successful',         variant: 'success'  },
  failed:              { label: 'Failed',              variant: 'danger'   },
  pending:             { label: 'Pending',             variant: 'warning'  },
  refunded:            { label: 'Refunded',            variant: 'default'  },
  partially_refunded:  { label: 'Part. Refunded',      variant: 'info'     },
}

const METHOD_LABELS: Record<string, string> = {
  cashfree: 'Cashfree',
  razorpay: 'Razorpay',
  upi:      'UPI',
  cod:      'Cash on Delivery',
  wallet:   'Wallet',
  split:    'Split Payment',
}

function MethodIcon({ method }: { method: string }) {
  if (method === 'wallet')        return <Wallet className="w-3.5 h-3.5" />
  if (method === 'cod')           return <Truck className="w-3.5 h-3.5" />
  return <CreditCard className="w-3.5 h-3.5" />
}

// ─── Refund form (inline, expands below a row) ───────────────────────────────

function RefundForm({ payment, onDone }: { payment: Payment; onDone: () => void }) {
  const maxRefundable = payment.amount - payment.refundedAmount
  const [amount,    setAmount]    = useState(String(maxRefundable / 100))
  const [reason,    setReason]    = useState('')
  const [isPartial, setIsPartial] = useState(false)
  const [error,     setError]     = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = () => {
    setError('')
    if (!reason.trim()) { setError('Please provide a reason for the refund.'); return }

    const amt = isPartial ? Number(amount) * 100 : undefined
    if (isPartial && (!amt || amt <= 0 || amt > maxRefundable)) {
      setError(`Amount must be between ₹0 and ${formatCurrency(maxRefundable)}.`)
      return
    }

    startTransition(async () => {
      const result = await refundPaymentAction(payment.id, reason.trim(), isPartial ? amt : undefined)
      if ('error' in result) { setError(result.error); return }
      onDone()
    })
  }

  return (
    <div className="px-5 py-4 bg-amber-50/60 border-t border-amber-100">
      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
        Process refund · {payment.paymentNumber}
      </p>
      <div className="flex flex-wrap items-end gap-3">
        {/* Full vs partial */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Refund type</label>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
            <button
              type="button"
              onClick={() => setIsPartial(false)}
              className={`px-3 py-2 transition-colors ${!isPartial ? 'bg-[#558476] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              Full — {formatCurrency(maxRefundable)}
            </button>
            <button
              type="button"
              onClick={() => setIsPartial(true)}
              className={`px-3 py-2 transition-colors ${isPartial ? 'bg-[#558476] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              Partial
            </button>
          </div>
        </div>

        {/* Partial amount */}
        {isPartial && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Amount (₹)</label>
            <input
              type="number"
              min={1}
              step={0.01}
              max={maxRefundable / 100}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-32 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#558476]/40 focus:border-[#558476]"
            />
          </div>
        )}

        {/* Reason */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-slate-500 mb-1">Reason <span className="text-rose-400">*</span></label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Product defective, customer request…"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#558476]/40 focus:border-[#558476]"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending ? 'Processing…' : 'Refund'}
          </button>
          <button
            onClick={onDone}
            className="px-4 py-2 text-sm font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-rose-600 mt-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

// ─── Main table ──────────────────────────────────────────────────────────────

type TabFilter = 'all' | PaymentStatus
type SortKey   = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'

const TABS: { label: string; value: TabFilter }[] = [
  { label: 'All',        value: 'all'               },
  { label: 'Successful', value: 'success'            },
  { label: 'Pending',    value: 'pending'            },
  { label: 'Failed',     value: 'failed'             },
  { label: 'Refunded',   value: 'refunded'           },
]

const SORT_OPTIONS: { label: string; value: SortKey }[] = [
  { label: 'Newest first',      value: 'date-desc'   },
  { label: 'Oldest first',      value: 'date-asc'    },
  { label: 'Amount: High → Low', value: 'amount-desc' },
  { label: 'Amount: Low → High', value: 'amount-asc'  },
]

function sortPayments(payments: Payment[], key: SortKey): Payment[] {
  return [...payments].sort((a, b) => {
    switch (key) {
      case 'date-desc':   return new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime()
      case 'date-asc':    return new Date(a.attemptedAt).getTime() - new Date(b.attemptedAt).getTime()
      case 'amount-desc': return b.amount - a.amount
      case 'amount-asc':  return a.amount - b.amount
    }
  })
}

export function PaymentsTable({ payments }: { payments: Payment[] }) {
  const [activeTab, setActiveTab] = useState<TabFilter>('all')
  const [search,    setSearch]    = useState('')
  const [sortKey,   setSortKey]   = useState<SortKey>('date-desc')
  const [refundingId, setRefundingId] = useState<string | null>(null)

  const tabCount = (tab: TabFilter) =>
    tab === 'all' ? payments.length : payments.filter((p) => p.status === tab).length

  const hasFilters = search !== ''

  const filtered = sortPayments(
    payments.filter((p) => {
      if (activeTab !== 'all' && p.status !== activeTab) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          p.paymentNumber.toLowerCase().includes(q) ||
          p.orderId.toLowerCase().includes(q) ||
          (p.cfPaymentId ?? '').toLowerCase().includes(q)
        )
      }
      return true
    }),
    sortKey,
  )

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">

      {/* Status tabs */}
      <div className="flex items-center gap-0.5 px-4 pt-3 border-b border-slate-100 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors border-b-2 -mb-px ${
              activeTab === tab.value
                ? 'text-[#558476] border-[#558476]'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              activeTab === tab.value
                ? 'bg-[#558476]/10 text-[#558476]'
                : 'bg-slate-100 text-slate-400'
            }`}>
              {tabCount(tab.value)}
            </span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 py-3 border-b border-slate-100">
        <div className="relative flex-1 max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search payment # or order ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#558476]/30 focus:border-[#558476] placeholder:text-slate-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="appearance-none h-9 pl-3 pr-8 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#558476]/30 cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
          {hasFilters && (
            <button onClick={() => setSearch('')} className="h-9 px-3 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
              Clear
            </button>
          )}
        </div>

        {(hasFilters || activeTab !== 'all') && (
          <p className="text-xs text-slate-500 ml-auto">
            <span className="font-semibold text-slate-700">{filtered.length}</span> of{' '}
            <span className="font-semibold text-slate-700">{payments.length}</span>
          </p>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Payment</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Amount</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Method</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Date</th>
              <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <PackageOpen className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">
                        {hasFilters || activeTab !== 'all' ? 'No payments match your filters' : 'No payments yet'}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {hasFilters || activeTab !== 'all' ? 'Try adjusting your search or filter' : 'Payments will appear here once customers start checking out'}
                      </p>
                    </div>
                    {(hasFilters || activeTab !== 'all') && (
                      <button
                        onClick={() => { setSearch(''); setActiveTab('all') }}
                        className="text-xs text-[#558476] hover:underline"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((payment) => {
                const statusCfg      = STATUS_CONFIG[payment.status]
                const isRefunding    = refundingId === payment.id
                const canRefund      = payment.status === 'success' && payment.refundedAmount < payment.amount
                const isPartRefunded = payment.status === 'success' && payment.refundedAmount > 0

                return (
                  <>
                    <tr
                      key={payment.id}
                      className="border-t border-slate-50 hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Payment # + Order link */}
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-semibold text-slate-800 font-mono">
                          {payment.paymentNumber}
                        </p>
                        <Link
                          href={`/orders/${payment.orderId}`}
                          className="text-xs text-[#558476] hover:underline mt-0.5 block"
                        >
                          View order →
                        </Link>
                        {payment.cfPaymentId && (
                          <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-[160px]" title={payment.cfPaymentId}>
                            {payment.cfPaymentId}
                          </p>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-bold text-slate-800">{formatCurrency(payment.amount)}</p>
                        {isPartRefunded && (
                          <p className="text-xs text-amber-600 mt-0.5">
                            −{formatCurrency(payment.refundedAmount)} refunded
                          </p>
                        )}
                        {payment.status === 'refunded' && (
                          <p className="text-xs text-slate-400 mt-0.5">Fully refunded</p>
                        )}
                      </td>

                      {/* Method + Gateway */}
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <div className="flex items-center gap-1.5">
                          <MethodIcon method={payment.method} />
                          <span className="text-sm text-slate-600">
                            {METHOD_LABELS[payment.method] ?? payment.method}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 capitalize">{payment.gateway}</p>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <div>
                          <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                          {payment.status === 'failed' && payment.failureReason && (
                            <p className="text-xs text-rose-500 mt-1 max-w-[140px] truncate" title={payment.failureReason}>
                              {payment.failureReason}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        <p className="text-sm text-slate-600">{formatDate(payment.attemptedAt)}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{formatTime(payment.attemptedAt)}</p>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        {canRefund && (
                          <button
                            onClick={() => setRefundingId(isRefunding ? null : payment.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${
                              isRefunding
                                ? 'bg-amber-50 border-amber-200 text-amber-700'
                                : 'border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50'
                            }`}
                          >
                            <RefreshCcw className="w-3.5 h-3.5" />
                            Refund
                          </button>
                        )}
                        {payment.status === 'refunded' && (
                          <div className="inline-flex items-center gap-1 text-xs text-slate-400">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            Refunded
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* Inline refund form */}
                    {isRefunding && (
                      <tr key={`${payment.id}-refund`}>
                        <td colSpan={6} className="p-0">
                          <RefundForm payment={payment} onDone={() => setRefundingId(null)} />
                        </td>
                      </tr>
                    )}
                  </>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {filtered.length > 0 && (
        <div className="px-5 py-3 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            {filtered.length} payment{filtered.length !== 1 ? 's' : ''}
            {hasFilters || activeTab !== 'all' ? ' matching current filters' : ' total'}
          </p>
        </div>
      )}
    </div>
  )
}
