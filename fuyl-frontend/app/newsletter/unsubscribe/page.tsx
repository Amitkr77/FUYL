'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { Spinner } from '@/components/ui/Spinner'
import { unsubscribeNewsletter } from '@/lib/api/content'
import { getErrorMessage } from '@/lib/api/client'

type Status = 'working' | 'success' | 'error'

export default function NewsletterUnsubscribePage() {
  return (
    <Suspense fallback={null}>
      <NewsletterUnsubscribeContent />
    </Suspense>
  )
}

function NewsletterUnsubscribeContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<Status>('working')
  const [email, setEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setError('This unsubscribe link is missing or invalid.')
      return
    }
    unsubscribeNewsletter(token)
      .then((res) => {
        if (res.unsubscribed) {
          setEmail(res.email ?? null)
          setStatus('success')
        } else {
          setError('This unsubscribe link is invalid or has already been used.')
          setStatus('error')
        }
      })
      .catch((err) => {
        setError(getErrorMessage(err, 'Something went wrong. Please try again.'))
        setStatus('error')
      })
  }, [token])

  if (status === 'working') {
    return (
      <div className="container-brand section-py max-w-md mx-auto text-center">
        <Spinner size={28} className="text-brand-forest mx-auto mb-6" />
        <p className="text-body-md text-brand-muted">Processing your request…</p>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="container-brand section-py max-w-md mx-auto text-center">
        <span className="w-16 h-16 rounded-full bg-brand-sage/70 text-brand-forest flex items-center justify-center mb-5 mx-auto">
          <CheckCircle2 size={32} />
        </span>
        <h1 className="text-display-lg font-display mb-4 text-brand-forest">YOU&apos;RE UNSUBSCRIBED</h1>
        <p className="text-body-sm text-brand-muted mb-8">
          {email ? (
            <>
              We&apos;ve removed <strong>{email}</strong> from the FUYL newsletter. You won&apos;t receive
              any more marketing emails from us.
            </>
          ) : (
            <>You won&apos;t receive any more marketing emails from us.</>
          )}
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center h-11 px-6 text-xs font-semibold uppercase tracking-widest bg-brand-forest text-white rounded-sm transition-colors hover:bg-brand-sage hover:text-brand-forest"
        >
          Back to Home
        </Link>
      </div>
    )
  }

  return (
    <div className="container-brand section-py max-w-md mx-auto text-center">
      <h1 className="text-display-lg font-display mb-4 text-brand-forest">SOMETHING WENT WRONG</h1>
      <p className="text-body-sm text-brand-muted mb-8">{error}</p>
      <Link
        href="/"
        className="inline-flex items-center justify-center h-11 px-6 text-xs font-semibold uppercase tracking-widest bg-brand-forest text-white rounded-sm transition-colors hover:bg-brand-sage hover:text-brand-forest"
      >
        Back to Home
      </Link>
    </div>
  )
}
