'use client'

import { useState } from 'react'
import { MapPin, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { checkPincodeServiceability } from '@/lib/api/shipping'
import { getErrorMessage } from '@/lib/api/client'

type Status = 'idle' | 'loading' | 'checked' | 'error'

const PINCODE_RE = /^[1-9][0-9]{5}$/

export function PincodeCheck() {
  const [pincode, setPincode] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<{ serviceable: boolean; cod: boolean } | null>(null)
  const [error, setError] = useState('')

  const handleCheck = async () => {
    if (!PINCODE_RE.test(pincode)) {
      setStatus('error')
      setError('Enter a valid 6-digit pincode')
      return
    }
    setStatus('loading')
    setError('')
    try {
      const res = await checkPincodeServiceability(pincode)
      setResult(res)
      setStatus('checked')
    } catch (err) {
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
              setPincode(e.target.value.replace(/\D/g, ''))
              setStatus('idle')
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
              Delivery available to {pincode}
              {result.cod ? ' · Cash on Delivery available' : ' · Prepaid only'}
            </>
          ) : (
            <>
              <AlertCircle size={14} />
              Sorry, we don&apos;t deliver to {pincode} yet
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
