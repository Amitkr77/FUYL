'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { verifyNewsletter, resendNewsletterVerification } from '@/lib/api/content'
import { getErrorMessage } from '@/lib/api/client'

type Status = 'verifying' | 'success' | 'error'

export default function NewsletterVerifyPage() {
  return (
    <Suspense fallback={null}>
      <NewsletterVerifyContent />
    </Suspense>
  )
}

function NewsletterVerifyContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<Status>('verifying')
  const [error, setError] = useState<string | null>(null)

  const [resendEmail, setResendEmail] = useState('')
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [resendError, setResendError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setError('This confirmation link is missing or invalid.')
      return
    }
    verifyNewsletter(token)
      .then((res) => {
        if (res.verified) {
          setStatus('success')
        } else {
          setError(
            res.reason === 'expired'
              ? 'This confirmation link has expired. Request a new one below.'
              : 'This confirmation link is invalid. Request a new one below.',
          )
          setStatus('error')
        }
      })
      .catch((err) => {
        setError(getErrorMessage(err, 'This link may have expired. Request a new one below.'))
        setStatus('error')
      })
  }, [token])

  const handleResend = async () => {
    if (!resendEmail.trim()) return
    setResendStatus('loading')
    setResendError(null)
    try {
      await resendNewsletterVerification(resendEmail.trim())
      setResendStatus('sent')
    } catch (err) {
      setResendError(getErrorMessage(err, 'Something went wrong. Please try again.'))
      setResendStatus('error')
    }
  }

  if (status === 'verifying') {
    return (
      <div className="container-brand section-py max-w-md mx-auto text-center">
        <Spinner size={28} className="text-brand-forest mx-auto mb-6" />
        <p className="text-body-md text-brand-muted">Confirming your subscription…</p>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="container-brand section-py max-w-md mx-auto text-center">
        <span className="w-16 h-16 rounded-full bg-brand-sage/70 text-brand-forest flex items-center justify-center mb-5 mx-auto">
          <CheckCircle2 size={32} />
        </span>
        <h1 className="text-display-lg font-display mb-4 text-brand-forest">YOU&apos;RE SUBSCRIBED</h1>
        <p className="text-body-sm text-brand-muted mb-8">
          Your email is confirmed. You&apos;ll now receive nutrition insights, new product drops, and
          subscriber-only offers.
        </p>
        <Link
          href="/collections/all"
          className="inline-flex items-center justify-center h-11 px-6 text-xs font-semibold uppercase tracking-widest bg-brand-forest text-white rounded-sm transition-colors hover:bg-brand-sage hover:text-brand-forest"
        >
          Explore FUYL
        </Link>
      </div>
    )
  }

  return (
    <div className="container-brand section-py max-w-md mx-auto text-center">
      <h1 className="text-display-lg font-display mb-4 text-brand-forest">CONFIRMATION FAILED</h1>
      <p className="text-body-sm text-brand-muted mb-8">{error}</p>

      <div className="bg-white border border-brand-border rounded-2xl shadow-sm p-6 sm:p-8 text-left">
        {resendStatus === 'sent' ? (
          <p className="text-body-sm text-brand-forest text-center">
            If <strong>{resendEmail}</strong> is awaiting confirmation, we&apos;ve sent a fresh link.
          </p>
        ) : (
          <>
            <p className="text-body-sm text-brand-muted mb-4">
              Enter your email and we&apos;ll send a new confirmation link.
            </p>
            <div className="flex flex-col gap-3">
              <input
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-11 px-3 text-body-sm border border-brand-border rounded-sm outline-none transition-colors focus:border-brand-teal"
              />
              {resendStatus === 'error' && resendError && (
                <p className="text-body-xs p-3 rounded-sm bg-red-50 text-red-700">{resendError}</p>
              )}
              <Button
                variant="primary"
                size="lg"
                fullWidth
                loading={resendStatus === 'loading'}
                disabled={!resendEmail.trim()}
                onClick={handleResend}
              >
                Resend Confirmation Email
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
