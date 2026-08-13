'use client'

import { useEffect, useState, useCallback, startTransition } from 'react'
import { useAffiliate }          from '@/lib/hooks/useAffiliate'
import { getAffiliateCommissions, type Commission, type CommissionStatus } from '@/lib/api/affiliate'
import { getErrorMessage }       from '@/lib/api/client'
import { DataTable, type ColumnDef } from '@/components/affiliate/shared/DataTable'
import { StatusBadge }           from '@/components/affiliate/shared/StatusBadge'
import { formatPrice }           from '@/lib/utils/formatPrice'

// ─── Filters ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { label: string; value: CommissionStatus | '' }[] = [
  { label: 'All statuses', value: '' },
  { label: 'Pending',      value: 'pending' },
  { label: 'Approved',     value: 'approved' },
  { label: 'Payable',      value: 'payable' },
  { label: 'Paid',         value: 'paid' },
  { label: 'Cancelled',    value: 'cancelled' },
  { label: 'Reversed',     value: 'reversed' },
]

function filterInput(label: string, value: string, onChange: (v: string) => void, type = 'text') {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 px-3 text-body-xs bg-white border border-brand-border rounded-lg outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 transition-all"
      />
    </div>
  )
}

// ─── Columns ─────────────────────────────────────────────────────────────────

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

const COLUMNS: ColumnDef<Commission>[] = [
  {
    key:    'createdAt',
    header: 'Created At',
    cell:   (r) => <span className="text-brand-muted">{fmt(r.createdAt)}</span>,
  },
  {
    key:    'referralId',
    header: 'Referral ID',
    cell:   (r) => (
      <span className="font-mono text-brand-muted text-[11px]">
        {r.attributionId ? r.attributionId.slice(-8).toUpperCase() : '—'}
      </span>
    ),
  },
  {
    key:    'orderId',
    header: 'Order No.',
    cell:   (r) => (
      <span className="font-mono text-brand-muted text-[11px]">
        {r.orderId.slice(-8).toUpperCase()}
      </span>
    ),
  },
  {
    key:    'baseAmount',
    header: 'Total Sales',
    align:  'right',
    cell:   (r) => <span className="tabular-nums">{formatPrice(r.baseAmount)}</span>,
  },
  {
    key:    'rate',
    header: 'Rate',
    align:  'right',
    cell:   (r) => <span className="tabular-nums text-brand-muted">{r.snapshotRate}%</span>,
  },
  {
    key:    'amount',
    header: 'Commission',
    align:  'right',
    cell:   (r) => <span className="tabular-nums font-semibold">{formatPrice(r.amount)}</span>,
  },
  {
    key:    'status',
    header: 'Status',
    cell:   (r) => <StatusBadge status={r.status} variant="commission" />,
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CommissionPage() {
  const { token } = useAffiliate()

  const [all,     setAll]     = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  // Filters
  const [status,   setStatus]   = useState<CommissionStatus | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')

  const load = useCallback(async () => {
    if (!token) return
    startTransition(() => { setLoading(true); setError('') })
    try {
      const data = await getAffiliateCommissions(token, {
        status:        status || undefined,
        createdAtFrom: dateFrom || undefined,
        createdAtTo:   dateTo   || undefined,
      })
      startTransition(() => setAll(data))
    } catch (err) {
      startTransition(() => setError(getErrorMessage(err, 'Could not load commissions.')))
    } finally {
      startTransition(() => setLoading(false))
    }
  }, [token, status, dateFrom, dateTo])

  useEffect(() => { void load() }, [load])

  return (
    <div className="space-y-5 max-w-5xl">
      <h1 className="text-display-md font-display text-brand-forest">COMMISSION</h1>

      {/* Filters */}
      <div className="bg-white border border-brand-border rounded-xl p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-brand-muted mb-3">Filters</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Date from */}
          {filterInput('Created From', dateFrom, setDateFrom, 'date')}
          {/* Date to */}
          {filterInput('Created To', dateTo, setDateTo, 'date')}

          {/* Status */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as CommissionStatus | '')}
              className="h-9 px-3 text-body-xs bg-white border border-brand-border rounded-lg outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 transition-all"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Clear */}
          <div className="flex flex-col gap-1 justify-end">
            <button
              type="button"
              onClick={() => { setStatus(''); setDateFrom(''); setDateTo('') }}
              className="h-9 px-4 text-body-xs font-semibold uppercase tracking-wider border border-brand-border rounded-lg text-brand-muted hover:bg-brand-sage/40 hover:text-brand-forest transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-body-xs text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
          {error}
        </p>
      )}

      {/* Table */}
      <DataTable
        columns={COLUMNS}
        rows={all}
        rowKey={(r) => r._id}
        loading={loading}
        emptyMessage="No commissions found for the selected filters."
      />
    </div>
  )
}
