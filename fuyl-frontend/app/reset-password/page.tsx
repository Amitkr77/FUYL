'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { resetPassword } from '@/lib/api/account'
import { getErrorMessage } from '@/lib/api/client'

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  )
}

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  const passwordsMatch = password.length > 0 && password === confirmPassword
  const complete = Boolean(token) && password.length >= 8 && passwordsMatch

  const handleSubmit = async () => {
    if (!complete || !token) return
    setStatus('loading')
    setError(null)
    try {
      await resetPassword(token, password)
      setStatus('success')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not reset your password. The link may have expired.'))
      setStatus('error')
    }
  }

  if (!token) {
    return (
      <div className="container-brand section-py max-w-md mx-auto text-center">
        <h1 className="text-display-lg font-display mb-4 text-brand-forest">INVALID LINK</h1>
        <p className="text-body-sm text-brand-muted mb-8">
          This password reset link is missing or invalid. Please request a new one.
        </p>
        <Link
          href="/account"
          className="inline-flex items-center justify-center h-11 px-6 text-xs font-semibold uppercase tracking-widest bg-brand-forest text-white rounded-sm transition-colors hover:bg-brand-sage hover:text-brand-forest"
        >
          Back to Sign In
        </Link>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="container-brand section-py max-w-md mx-auto text-center">
        <h1 className="text-display-lg font-display mb-4 text-brand-forest">PASSWORD RESET</h1>
        <p className="text-body-sm text-brand-muted mb-8">
          Your password has been updated. You can now sign in with your new password.
        </p>
        <Link
          href="/account"
          className="inline-flex items-center justify-center h-11 px-6 text-xs font-semibold uppercase tracking-widest bg-brand-forest text-white rounded-sm transition-colors hover:bg-brand-sage hover:text-brand-forest"
        >
          Sign In
        </Link>
      </div>
    )
  }

  return (
    <div className="container-brand section-py max-w-md mx-auto">
      <h1 className="text-display-lg font-display mb-8 text-center text-brand-forest">SET NEW PASSWORD</h1>

      <div className="bg-white border border-brand-border rounded-2xl shadow-sm p-6 sm:p-8">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit()
          }}
          className="space-y-4"
        >
          <PasswordField
            label="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            show={showPassword}
            onToggleShow={() => setShowPassword((s) => !s)}
          />
          <PasswordField
            label="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            show={showPassword}
            onToggleShow={() => setShowPassword((s) => !s)}
          />

          {password && password.length < 8 && (
            <p className="text-body-xs text-brand-muted">Password must be at least 8 characters.</p>
          )}
          {password && confirmPassword && !passwordsMatch && (
            <p className="text-body-xs text-red-700">Passwords don&apos;t match.</p>
          )}
          {status === 'error' && error && (
            <p className="text-body-xs p-3 rounded-sm bg-red-50 text-red-700">{error}</p>
          )}

          <Button type="submit" variant="primary" size="lg" fullWidth loading={status === 'loading'} disabled={!complete}>
            Reset Password
          </Button>
        </form>
      </div>
    </div>
  )
}

function PasswordField({ label, value, onChange, show, onToggleShow }: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  show: boolean
  onToggleShow: () => void
}) {
  return (
    <div>
      <label className="block text-label mb-1.5 text-brand-muted">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          className="w-full h-11 px-3 pr-10 text-body-sm border border-brand-border rounded-sm outline-none transition-colors focus:border-brand-teal"
        />
        <button
          type="button"
          onClick={onToggleShow}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-forest transition-colors"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )
}
