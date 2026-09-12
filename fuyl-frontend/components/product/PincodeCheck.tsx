'use client'

import { useRef, useState } from 'react'
import { MapPin, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { checkPincodeServiceability, checkPincodeServiceabilityForProduct } from '@/lib/api/shipping'
import { getErrorMessage } from '@/lib/api/client'

type Status = 'idle' | 'loading' | 'checked' | 'error'

const PINCODE_RE = /^[1-9][0-9]{5}$/

interface PincodeCheckProps {
  productId?: string
  variantId?: string
  weightGrams?: number
}

export function PincodeCheck({ productId, variantId, weightGrams }: PincodeCheckProps) {
  const [pincode, setPincode] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<{
    serviceable: boolean
    etdDays: number | null
    checkedPincode: string
  } | null>(null)
  const [error, setError] = useState('')
  const requestRef = useRef<{ id: number; controller?: AbortController }>({ id: 0 })

  const handleCheck = async () => {
    const checkedPincode = pincode
    if (!PINCODE_RE.test(checkedPincode)) {
      setStatus('error')
      setError('Enter a valid 6-digit pincode')
      return
    }
    setStatus('loading')
    setError('')
    setResult(null)
    requestRef.current.controller?.abort()
    const requestId = requestRef.current.id + 1
    const controller = new AbortController()
    requestRef.current = { id: requestId, controller }
    try {
      const res = productId
        ? await checkPincodeServiceabilityForProduct(checkedPincode, productId, variantId, weightGrams, controller.signal)
        : await checkPincodeServiceability(checkedPincode, controller.signal)
      if (requestRef.current.id !== requestId) return
      setResult({ serviceable: res.serviceable, etdDays: res.etdDays, checkedPincode })
      setStatus('checked')
    } catch (err) {
      if (controller.signal.aborted || requestRef.current.id !== requestId) return
      setError(getErrorMessage(err, 'Could not check this pincode. Please try again.'))
      setStatus('error')
    }
  }

  return (
    <div className="flex flex-col gap-2 pt-1">
      <span className="text-label text-brand-muted">Check Delivery</span>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="Enter pincode"
            value={pincode}
            onChange={(e) => {
              requestRef.current.controller?.abort()
              requestRef.current = { id: requestRef.current.id + 1 }
              setPincode(e.target.value.replace(/\D/g, ''))
              setStatus('idle')
              setResult(null)
              setError('')
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
            className="h-11 w-full rounded-sm border pl-9 pr-3 text-body-sm"
            style={{ borderColor: 'var(--color-brand-border)' }}
          />
        </div>
        <Button
          variant="outline"
          size="md"
          loading={status === 'loading'}
          onClick={handleCheck}
        >
          Check
        </Button>
      </div>

      {status === 'checked' && result && (
        <p
          className="flex items-center gap-1.5 text-body-xs"
          style={{ color: result.serviceable ? 'var(--color-brand-teal)' : '#B91C1C' }}
        >
          {result.serviceable ? (
            <>
              <Check size={14} />
              Delivery available to {result.checkedPincode}
              {result.etdDays != null
                ? ` · Estimated delivery in ${result.etdDays}–${result.etdDays + 1} day${result.etdDays > 1 ? 's' : ''}`
                : ''}
            </>
          ) : (
            <>
              <AlertCircle size={14} />
              Sorry, we don&apos;t deliver to {result.checkedPincode} yet
            </>
          )}
        </p>
      )}

      {status === 'error' && error && (
        <p className="flex items-center gap-1.5 text-body-xs" style={{ color: '#B91C1C' }}>
          <AlertCircle size={14} />
          {error}
        </p>
      )}
    </div>
  )
}
