'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store/authStore'
import { applyReferralCode } from '@/lib/api/referrals'
import { getErrorMessage } from '@/lib/api/client'

// Landing page for a shared referral link (fuyl.in/ref/CODE). A signed-in
// visitor gets the code applied immediately; a signed-out one is sent to
// registration with the code carried through — applying automatically
// happens server-side as part of account creation (see identity.service.ts's
// USER_REGISTERED -> referral module handoff).
export default function ReferralLandingPage() {
  const params = useParams<{ code: string }>()
  const router = useRouter()
  const [status, setStatus] = useState<'checking' | 'applied' | 'error'>('checking')
  const [error, setError] = useState('')

  useEffect(() => {
    // The auth store persists to localStorage and rehydrates asynchronously
    // on mount — `token` reads as null for an instant even for an
    // already-signed-in visitor, so waiting for hasHydrated() avoids
    // wrongly bouncing them to registration before their real session loads.
    const decide = () => {
      const current = useAuthStore.getState().token
      if (!current) {
        router.replace(`/account?ref=${encodeURIComponent(params.code)}&redirect=/`)
        return
      }
      applyReferralCode(current, params.code)
        .then(() => setStatus('applied'))
        .catch((err) => {
          setError(getErrorMessage(err, 'Could not apply this referral code.'))
          setStatus('error')
        })
    }

    if (useAuthStore.persist.hasHydrated()) {
      decide()
    } else {
      const unsub = useAuthStore.persist.onFinishHydration(decide)
      return unsub
    }
  }, [params.code, router])

  return (
    <div className="container-brand section-py text-center max-w-md mx-auto">
      {status === 'checking' && (
        <p className="text-body-md" style={{ color: 'var(--color-brand-muted)' }}>One moment…</p>
      )}
      {status === 'applied' && (
        <>
          <h1 className="text-display-lg font-display mb-4">YOU&apos;RE IN</h1>
          <p className="text-body-md mb-8" style={{ color: 'var(--color-brand-muted)' }}>
            Referral code <strong>{params.code}</strong> has been applied to your account.
          </p>
          <Link href="/" className="inline-flex items-center justify-center h-11 px-6 text-xs font-semibold uppercase tracking-widest bg-brand-forest text-white rounded-sm transition-colors hover:bg-brand-sage hover:text-brand-forest">
            Start Shopping
          </Link>
        </>
      )}
      {status === 'error' && (
        <>
          <h1 className="text-display-lg font-display mb-4">HMM</h1>
          <p className="text-body-md mb-8" style={{ color: 'var(--color-brand-muted)' }}>{error}</p>
          <Link href="/" className="inline-flex items-center justify-center h-11 px-6 text-xs font-semibold uppercase tracking-widest border rounded-sm transition-colors" style={{ borderColor: 'var(--color-brand-border)' }}>
            Continue to FUYL
          </Link>
        </>
      )}
    </div>
  )
}
