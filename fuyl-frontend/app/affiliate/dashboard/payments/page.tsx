'use client'

import { useEffect, useState } from 'react'
import { useAffiliate }        from '@/lib/hooks/useAffiliate'
import { getAffiliatePayouts, type AffiliatePayout } from '@/lib/api/affiliate'
import { getErrorMessage }     from '@/lib/api/client'
import { DataTable, type ColumnDef } from '@/components/affiliate/shared/DataTable'
import { StatusBadge }         from '@/components/affiliate/shared/StatusBadge'
import { formatPrice }         from '@/lib/utils/formatPrice'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'

const METHOD_LABEL: Record<string, string> = {
  upi:            'UPI',
  bank_transfer:  'Bank Transfer',
  wallet_credit:  'Wallet Credit',
}

// ─── Columns ─────────────────────────────────────────────────────────────────

const COLUMNS: ColumnDef<AffiliatePayout>[] = [
  {
    key:    'createdAt',
    header: 'Date & Time',
    cell:   (r) => <span className="text-brand-muted whitespace-nowrap">{fmt(r.createdAt)}</span>,
  },
  {
    key:    'amount',
    header: 'Processed Amount',
    align:  'right',
    cell:   (r) => <span className="tabular-nums font-semibold">{formatPrice(r.amount)}</span>,
  },
  {
    key:    'paymentMethod',
    header: 'Payment Method',
    cell:   (r) => (
      <span className="text-brand-muted">{METHOD_LABEL[r.paymentMethod] ?? r.paymentMethod}</span>
    ),
  },
  {
    key:    'status',
    header: 'Status',
    cell:   (r) => <StatusBadge status={r.status} variant="payout" />,
  },
  {
    key:    'action',
    header: 'Action',
    align:  'right',
    cell:   (r) => (
      <div className="text-body-xs text-brand-muted space-y-0.5">
        {r.paidAt && <p>Paid: {fmt(r.paidAt)}</p>}
        {r.failureReason && (
          <p className="text-red-500 text-[10px]">{r.failureReason}</p>
        )}
      </div>
    ),
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const { token } = useAffiliate()

  const [payouts, setPayouts] = useState<AffiliatePayout[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (!token) return
    getAffiliatePayouts(token)
      .then(setPayouts)
      .catch((err) => setError(getErrorMessage(err, 'Could not load payments.')))
      .finally(() => setLoading(false))
  }, [token])

  // Summary totals
  const totalPaid = payouts
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <h1 className="text-display-md font-display text-brand-forest">PAYMENTS</h1>
        {totalPaid > 0 && (
          <p className="text-body-sm text-brand-muted">
            Total paid out:{' '}
            <strong className="text-brand-forest">{formatPrice(totalPaid)}</strong>
          </p>
        )}
      </div>

      {error && (
        <p className="text-body-xs text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
          {error}
        </p>
      )}

      <DataTable
        columns={COLUMNS}
        rows={payouts}
        rowKey={(r) => r._id}
        loading={loading}
        emptyMessage="No payments yet. Commission must reach the minimum payout threshold before a payment is processed."
      />
    </div>
  )
}
