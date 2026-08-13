'use client'

import { useState } from 'react'
import { useAffiliate }            from '@/lib/hooks/useAffiliate'
import { updateAffiliatePaymentInfo } from '@/lib/api/affiliate'
import { apiFetch, getErrorMessage }  from '@/lib/api/client'
import { CreditCard, Building2, Check, Lock, AlertCircle, Pencil } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Method = 'upi' | 'bank'

type FlowState = 'view' | 'edit' | 'otp' | 'done'

interface PaymentFormData {
  method:      Method
  upi:         string
  bankAccount: string
  ifsc:        string
  accountName: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label:        string
  value:        string
  onChange:     (v: string) => void
  placeholder?: string
  type?:        string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 px-3 text-body-xs bg-white border border-brand-border rounded-lg outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 transition-all"
      />
    </div>
  )
}

// ─── Masked display of saved info ─────────────────────────────────────────────

function MaskedInfo({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  const masked = value.length > 6
    ? `${value.slice(0, 3)}${'•'.repeat(value.length - 6)}${value.slice(-3)}`
    : '••••••'
  return (
    <div className="flex items-center justify-between py-2 border-b border-brand-border/40 last:border-0">
      <span className="text-[11px] text-brand-muted uppercase tracking-wider">{label}</span>
      <span className="text-body-xs font-mono text-brand-forest">{masked}</span>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PaymentTaxTab() {
  const { token, affiliate } = useAffiliate()

  const saved = affiliate?.paymentInfo

  const [flow,    setFlow]    = useState<FlowState>('view')
  const [form,    setForm]    = useState<PaymentFormData>({
    method:      'upi',
    upi:         '',
    bankAccount: '',
    ifsc:        '',
    accountName: '',
  })
  const [otp,     setOtp]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const set = (k: keyof PaymentFormData) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }))

  // Step 1: validate form → request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !affiliate) return

    const hasUpi  = form.method === 'upi'  && form.upi.trim()
    const hasBank = form.method === 'bank' && form.bankAccount.trim() && form.ifsc.trim() && form.accountName.trim()
    if (!hasUpi && !hasBank) {
      setError('Please fill in all required payment fields.')
      return
    }

    setLoading(true)
    setError('')
    try {
      // Send OTP to the affiliate's registered email/phone
      await apiFetch('/auth/otp/request', {
        method: 'POST',
        body:   { identifier: affiliate.email },
      })
      setFlow('otp')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not send OTP. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  // Step 2: verify OTP → save payment info
  const handleVerifyAndSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !affiliate || !otp.trim()) return

    setLoading(true)
    setError('')
    try {
      // Verify OTP
      await apiFetch('/auth/otp/verify', {
        method: 'POST',
        body:   { identifier: affiliate.email, code: otp.trim() },
      })

      // Save payment info
      const payload = form.method === 'upi'
        ? { upi: form.upi.trim() }
        : {
            bankAccount: form.bankAccount.trim(),
            ifsc:        form.ifsc.trim().toUpperCase(),
            accountName: form.accountName.trim(),
          }

      await updateAffiliatePaymentInfo(token, payload)
      setFlow('done')
      setOtp('')
    } catch (err) {
      setError(getErrorMessage(err, 'OTP verification failed. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  const startEdit = () => {
    setError('')
    setOtp('')
    setFlow('edit')
  }

  // ── View ──────────────────────────────────────────────────────────────────

  if (flow === 'view' || flow === 'done') {
    return (
      <div className="space-y-5 max-w-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard size={15} className="text-brand-forest" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-brand-forest">
              Payment Information
            </p>
          </div>
          <button
            type="button"
            onClick={startEdit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider border border-brand-border rounded-lg text-brand-muted hover:text-brand-forest hover:bg-brand-sage/40 transition-colors"
          >
            <Pencil size={12} />
            {saved?.upi || saved?.bankAccount ? 'Update' : 'Add'}
          </button>
        </div>

        {flow === 'done' && (
          <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-100 rounded-xl text-body-xs text-green-700">
            <Check size={14} className="shrink-0" />
            Payment information saved successfully.
          </div>
        )}

        <div className="bg-white border border-brand-border rounded-xl p-5">
          {saved?.upi || saved?.bankAccount || saved?.ifsc ? (
            <div className="space-y-0.5">
              <MaskedInfo label="UPI ID"         value={saved?.upi} />
              <MaskedInfo label="Account Number" value={saved?.bankAccount} />
              <MaskedInfo label="IFSC"           value={saved?.ifsc} />
              <MaskedInfo label="Account Name"   value={saved?.accountName} />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="w-12 h-12 rounded-full bg-brand-cream flex items-center justify-center">
                <Building2 size={22} className="text-brand-muted" />
              </div>
              <p className="text-body-sm text-brand-muted">No payment information on file.</p>
              <p className="text-[11px] text-brand-muted max-w-xs">
                Add your UPI ID or bank account details to receive commission payouts.
              </p>
            </div>
          )}
        </div>

        {/* Security note */}
        <div className="flex items-start gap-3 px-4 py-3 bg-brand-cream/60 border border-brand-border rounded-xl">
          <Lock size={13} className="text-brand-muted shrink-0 mt-0.5" />
          <p className="text-[11px] text-brand-muted leading-relaxed">
            Payment information is verified via OTP before saving and is encrypted at rest.
            FUYL never shares your banking details with third parties.
          </p>
        </div>
      </div>
    )
  }

  // ── Edit form ─────────────────────────────────────────────────────────────

  if (flow === 'edit') {
    return (
      <form onSubmit={handleRequestOtp} className="space-y-5 max-w-2xl">
        <div className="flex items-center gap-2">
          <CreditCard size={15} className="text-brand-forest" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-brand-forest">
            Update Payment Details
          </p>
        </div>

        {/* Method selector */}
        <div className="flex gap-2">
          {(['upi', 'bank'] as Method[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setForm((f) => ({ ...f, method: m }))}
              className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-lg border transition-colors ${
                form.method === m
                  ? 'bg-brand-forest text-white border-brand-forest'
                  : 'border-brand-border text-brand-muted hover:border-brand-forest hover:text-brand-forest'
              }`}
            >
              {m === 'upi' ? 'UPI' : 'Bank Transfer'}
            </button>
          ))}
        </div>

        <div className="bg-white border border-brand-border rounded-xl p-5 space-y-4">
          {form.method === 'upi' ? (
            <Field
              label="UPI ID"
              value={form.upi}
              onChange={set('upi')}
              placeholder="name@upi"
            />
          ) : (
            <>
              <Field
                label="Account Holder Name"
                value={form.accountName}
                onChange={set('accountName')}
                placeholder="As per bank records"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="Account Number"
                  value={form.bankAccount}
                  onChange={set('bankAccount')}
                  placeholder="1234567890"
                />
                <Field
                  label="IFSC Code"
                  value={form.ifsc}
                  onChange={set('ifsc')}
                  placeholder="HDFC0001234"
                />
              </div>
            </>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-body-xs text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
            <AlertCircle size={14} className="shrink-0" />
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-brand-forest text-white text-label tracking-wider uppercase rounded-lg hover:bg-brand-olive transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending OTP…' : 'Continue → Verify with OTP'}
          </button>
          <button
            type="button"
            onClick={() => { setFlow('view'); setError('') }}
            className="px-4 py-2.5 text-label text-brand-muted hover:text-brand-forest transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    )
  }

  // ── OTP verification ──────────────────────────────────────────────────────

  return (
    <form onSubmit={handleVerifyAndSave} className="space-y-5 max-w-sm">
      <div className="flex items-center gap-2">
        <Lock size={15} className="text-brand-forest" />
        <p className="text-[11px] font-bold uppercase tracking-wider text-brand-forest">
          Verify Your Identity
        </p>
      </div>

      <p className="text-body-sm text-brand-muted">
        A one-time code has been sent to{' '}
        <strong className="text-brand-forest">{affiliate?.email}</strong>.
        Enter it below to save your payment details.
      </p>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
          One-Time Code
        </label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          placeholder="123456"
          className="h-12 px-4 text-center text-xl font-mono tracking-[0.5em] bg-white border border-brand-border rounded-xl outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 transition-all"
          autoFocus
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-body-xs text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading || otp.length < 4}
          className="px-6 py-2.5 bg-brand-forest text-white text-label tracking-wider uppercase rounded-lg hover:bg-brand-olive transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Verifying…' : 'Verify & Save'}
        </button>
        <button
          type="button"
          onClick={() => { setFlow('edit'); setError('') }}
          className="px-4 py-2.5 text-label text-brand-muted hover:text-brand-forest transition-colors"
        >
          Back
        </button>
      </div>
    </form>
  )
}
