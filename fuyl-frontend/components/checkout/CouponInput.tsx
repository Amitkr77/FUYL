'use client'

import { useState } from 'react'
import { Tag, X, Loader2, Pencil } from 'lucide-react'
import { validateCoupon } from '@/lib/api/discount'
import type { CartItem } from '@/types/cart'
import { getErrorMessage } from '@/lib/api/client'

export interface AppliedCoupon {
  code: string
  discountAmount: number
}

interface CouponInputProps {
  items:   CartItem[]
  token?:  string
  applied: AppliedCoupon | null
  onApply:  (coupon: AppliedCoupon) => void
  onRemove: () => void
}

// Works identically for a guest or a logged-in shopper — validate-coupon
// no longer requires auth (see fuyl-backend's discount routes), so this
// can sit in the order summary from the very first render.
export function CouponInput({ items, token, applied, onApply, onRemove }: CouponInputProps) {
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)

  const handleApply = async () => {
    const trimmed = code.trim()
    if (!trimmed) return
    setStatus('loading')
    setError('')
    try {
      const result = await validateCoupon(trimmed, items, token)
      if (!result.valid) {
        setStatus('error')
        setError(result.reason ?? 'This code is not valid.')
        return
      }
      onApply({ code: result.couponCode, discountAmount: result.discountAmount ?? 0 })
      setStatus('idle')
      setCode('')
      setEditing(false)
    } catch (err) {
      setStatus('error')
      setError(getErrorMessage(err, 'Could not validate this code. Please try again.'))
    }
  }

  const handleEdit = () => {
    setCode(applied?.code ?? '')
    setEditing(true)
    onRemove()
  }

  if (applied && !editing) {
    return (
      <div className="flex items-center justify-between gap-3 p-3 rounded-sm bg-brand-sage">
        <div className="flex items-center gap-2 min-w-0">
          <Tag size={15} className="shrink-0 text-brand-forest" />
          <span className="text-body-sm font-semibold text-brand-forest truncate">{applied.code}</span>
          <span className="text-body-xs text-brand-forest/70">applied</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleEdit}
            aria-label="Edit coupon"
            className="-m-1 p-1 text-brand-forest hover:text-brand-forest/70 transition-colors"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove coupon"
            className="-m-1 p-1 text-brand-forest hover:text-red-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setStatus('idle'); setError('') }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleApply() } }}
          placeholder="Promo code"
          aria-label="Promo code"
          autoFocus={editing}
          className={`min-w-0 flex-1 h-11 sm:h-10 px-3 text-body-sm border rounded-sm outline-none uppercase tracking-wide transition-colors ${
            status === 'error' ? 'border-red-400' : 'border-brand-border'
          }`}
        />
        <button
          type="button"
          onClick={handleApply}
          disabled={!code.trim() || status === 'loading'}
          className="shrink-0 inline-flex items-center justify-center min-w-20 h-11 sm:h-10 px-4 text-xs font-semibold uppercase tracking-widest border rounded-sm transition-colors disabled:opacity-50 border-brand-forest text-brand-forest hover:bg-brand-forest hover:text-white"
        >
          {status === 'loading' ? <Loader2 size={15} className="animate-spin" /> : 'Apply'}
        </button>
        {editing && (
          <button
            type="button"
            onClick={() => { setEditing(false); setCode(''); setStatus('idle'); setError('') }}
            aria-label="Cancel edit"
            className="shrink-0 inline-flex items-center justify-center h-11 sm:h-10 px-3 border border-brand-border rounded-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <X size={15} />
          </button>
        )}
      </div>
      {status === 'error' && error && (
        <p className="text-body-xs mt-1.5 text-red-600">{error}</p>
      )}
    </div>
  )
}
