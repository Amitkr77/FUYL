'use client'

import { useState } from 'react'
import { XCircle, AlertTriangle } from 'lucide-react'
import { cancelOrder } from '@/lib/api/account'
import { getErrorMessage } from '@/lib/api/client'

const CANCEL_REASONS = [
  'Changed my mind',
  'Ordered by mistake',
  'Found a better price elsewhere',
  'Delivery time is too long',
  'Other',
]

export function CancelOrderPanel({
  token,
  orderId,
  onDone,
}: {
  token: string
  orderId: string
  onDone: () => void
}) {
  const [open, setOpen]           = useState(false)
  const [selected, setSelected]   = useState('')
  const [custom, setCustom]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState('')

  const reason = selected === 'Other' ? custom.trim() : selected

  const submit = async () => {
    if (!reason || (selected === 'Other' && custom.trim().length < 3)) {
      setError('Please select or enter a cancellation reason.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await cancelOrder(token, orderId, reason)
      setOpen(false)
      onDone()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not cancel this order. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <div className="rounded-2xl border border-brand-border bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-body-sm font-semibold text-brand-forest">Cancel this order?</p>
            <p className="text-body-xs text-brand-muted mt-0.5">
              Cancellation is only possible before the order ships.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 h-9 px-4 text-body-xs font-semibold text-red-600 border border-red-200 rounded-lg bg-red-50/50 hover:bg-red-100 hover:border-red-300 transition-colors"
          >
            Cancel Order
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-red-100 bg-red-50/30 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
          <AlertTriangle size={16} className="text-red-600" />
        </div>
        <div>
          <p className="text-body-sm font-semibold text-brand-forest">Cancel Order</p>
          <p className="text-body-xs text-brand-muted mt-0.5">
            This cannot be undone. Select a reason:
          </p>
        </div>
      </div>

      {/* Reason picker */}
      <div className="space-y-2">
        {CANCEL_REASONS.map((r) => (
          <label key={r} className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border cursor-pointer text-body-sm transition-colors ${
            selected === r
              ? 'border-red-300 bg-white text-brand-forest'
              : 'border-transparent bg-white/60 text-brand-muted hover:bg-white'
          }`}>
            <input
              type="radio"
              name="cancel-reason"
              value={r}
              checked={selected === r}
              onChange={() => { setSelected(r); setError('') }}
              className="accent-red-500 shrink-0"
            />
            {r}
          </label>
        ))}
      </div>

      {/* Custom reason textarea */}
      {selected === 'Other' && (
        <textarea
          value={custom}
          onChange={(e) => { setCustom(e.target.value); setError('') }}
          rows={2}
          maxLength={500}
          placeholder="Describe your reason…"
          className="w-full px-3.5 py-2.5 text-body-sm border border-brand-border rounded-xl resize-none bg-white outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 transition-colors"
        />
      )}

      {error && (
        <div className="flex items-center gap-2 text-body-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          <XCircle size={13} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={() => { setOpen(false); setError(''); setSelected(''); setCustom('') }}
          disabled={submitting}
          className="flex-1 h-10 text-body-xs font-semibold border border-brand-border rounded-lg text-brand-muted hover:bg-brand-sage/30 hover:text-brand-forest transition-colors disabled:opacity-50"
        >
          Keep Order
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={submitting || !selected || (selected === 'Other' && custom.trim().length < 3)}
          className="flex-1 h-10 text-body-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Cancelling…' : 'Confirm Cancel'}
        </button>
      </div>
    </div>
  )
}
