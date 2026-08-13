'use client'

import { useState } from 'react'
import { useAffiliate }          from '@/lib/hooks/useAffiliate'
import { apiFetch, getErrorMessage } from '@/lib/api/client'
import { Lock, ShieldCheck, Smartphone, Eye, EyeOff, Check, AlertCircle } from 'lucide-react'

// ─── Change Password ──────────────────────────────────────────────────────────

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label:       string
  value:       string
  onChange:    (v: string) => void
  placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-9 w-full pl-3 pr-9 text-body-xs bg-white border border-brand-border rounded-lg outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 transition-all"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((v) => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-forest transition-colors"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  )
}

function ChangePasswordCard() {
  const { token } = useAffiliate()

  const [current,  setCurrent]  = useState('')
  const [next,     setNext]     = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState(false)
  const [error,    setError]    = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    if (next !== confirm) { setError('New passwords do not match.'); return }
    if (next.length < 8)  { setError('Password must be at least 8 characters.'); return }

    setLoading(true)
    setError('')
    try {
      await apiFetch('/auth/change-password', {
        method: 'POST',
        token,
        body:   { currentPassword: current, newPassword: next },
      })
      setSuccess(true)
      setCurrent('')
      setNext('')
      setConfirm('')
      setTimeout(() => setSuccess(false), 4000)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not change password. Please check your current password.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-brand-border rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Lock size={13} className="text-brand-forest" />
        <p className="text-[11px] font-bold uppercase tracking-wider text-brand-forest">
          Change Password
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
        <PasswordField
          label="Current Password"
          value={current}
          onChange={setCurrent}
          placeholder="Your current password"
        />
        <PasswordField
          label="New Password"
          value={next}
          onChange={setNext}
          placeholder="At least 8 characters"
        />
        <PasswordField
          label="Confirm New Password"
          value={confirm}
          onChange={setConfirm}
          placeholder="Repeat new password"
        />

        {error && (
          <div className="flex items-center gap-2 text-body-xs text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
            <AlertCircle size={14} className="shrink-0" />
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={loading || !current || !next || !confirm}
            className="px-6 py-2.5 bg-brand-forest text-white text-label tracking-wider uppercase rounded-lg hover:bg-brand-olive transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving…' : 'Update Password'}
          </button>
          {success && (
            <span className="inline-flex items-center gap-1.5 text-body-xs text-brand-teal font-semibold">
              <Check size={14} /> Password updated!
            </span>
          )}
        </div>
      </form>
    </div>
  )
}

// ─── OTP / Email verification info ───────────────────────────────────────────

function OtpInfoCard() {
  const { affiliate } = useAffiliate()
  return (
    <div className="bg-white border border-brand-border rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck size={13} className="text-brand-forest" />
        <p className="text-[11px] font-bold uppercase tracking-wider text-brand-forest">
          Email OTP Verification
        </p>
      </div>
      <p className="text-body-xs text-brand-muted leading-relaxed">
        Sensitive actions (like updating payment details) require a one-time code sent to{' '}
        <strong className="text-brand-forest">{affiliate?.email ?? 'your registered email'}</strong>.
        This adds an extra layer of security beyond your password.
      </p>
      <div className="flex items-center gap-2 px-3 py-2 bg-brand-cream/60 border border-brand-border rounded-lg">
        <div className="w-2 h-2 rounded-full bg-brand-teal shrink-0" />
        <p className="text-[11px] text-brand-muted">OTP is active and protecting your account</p>
      </div>
    </div>
  )
}

// ─── 2FA stub ─────────────────────────────────────────────────────────────────

function TwoFactorCard() {
  return (
    <div className="bg-white border border-brand-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Smartphone size={13} className="text-brand-forest" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-brand-forest">
            Two-Factor Authentication
          </p>
        </div>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-sage text-brand-forest border border-brand-border">
          Coming Soon
        </span>
      </div>

      <p className="text-body-xs text-brand-muted leading-relaxed">
        Authenticator-app (TOTP) 2FA is under development and will be available soon.
        When enabled, you will need your phone each time you sign in, providing the
        strongest protection for your affiliate account.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Authenticator App', desc: 'Google Authenticator, Authy, 1Password' },
          { label: 'Recovery Codes',    desc: 'One-time backup codes for account recovery' },
          { label: 'Trusted Devices',  desc: 'Skip 2FA on devices you trust' },
        ].map(({ label, desc }) => (
          <div
            key={label}
            className="p-3 border border-brand-border/60 rounded-lg bg-brand-cream/30 opacity-60"
          >
            <p className="text-[11px] font-semibold text-brand-forest mb-0.5">{label}</p>
            <p className="text-[10px] text-brand-muted leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SecurityTab() {
  return (
    <div className="space-y-5 max-w-2xl">
      <ChangePasswordCard />
      <OtpInfoCard />
      <TwoFactorCard />
    </div>
  )
}
