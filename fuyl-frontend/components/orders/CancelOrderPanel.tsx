'use client'

import { useState } from 'react'
import { cancelOrder } from '@/lib/api/account'
import { getErrorMessage } from '@/lib/api/client'

// Shown only for orders that haven't shipped yet (pending/confirmed/packed) —
// the backend rejects a customer cancel once the order is SHIPPED.
export function CancelOrderPanel({
  token,
  orderId,
  onDone,
}: {
  token: string
  orderId: string
  onDone: () => void
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (reason.trim().length < 3) {
      setError('Please tell us why you’re cancelling.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await cancelOrder(token, orderId, reason.trim())
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-body-sm font-semibold text-red-600 hover:underline"
      >
        Cancel this order
      </button>
    )
  }

  return (
    <div className="rounded-2xl border border-brand-border p-5">
      <p className="text-label text-brand-muted mb-1">Cancel order</p>
      <p className="text-body-sm text-brand-muted mb-3">
        You can cancel until the order ships. Let us know why:
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        maxLength={500}
        placeholder="Reason for cancellation"
        className="w-full px-3 py-2.5 text-body-sm border rounded-sm resize-none"
        style={{ borderColor: 'var(--color-brand-border)' }}
      />
      {error && <p className="text-body-xs text-red-600 mt-2">{error}</p>}
      <div className="flex gap-3 mt-3">
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="inline-flex items-center justify-center h-10 px-5 text-xs font-semibold uppercase tracking-widest bg-red-600 text-white rounded-sm transition-colors hover:bg-red-700 disabled:opacity-60"
        >
          {submitting ? 'Cancelling…' : 'Confirm cancellation'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError('') }}
          disabled={submitting}
          className="inline-flex items-center justify-center h-10 px-5 text-xs font-semibold uppercase tracking-widest border rounded-sm transition-colors hover:bg-brand-sage/40 disabled:opacity-60"
          style={{ borderColor: 'var(--color-brand-border)' }}
        >
          Keep order
        </button>
      </div>
    </div>
  )
}
