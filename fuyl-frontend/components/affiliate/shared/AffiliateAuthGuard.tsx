'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { useAffiliateStore } from '@/lib/store/affiliateStore'
import { Skeleton } from '@/components/ui/Skeleton'

type GuardState = 'checking' | 'authorized' | 'redirecting'

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-6 animate-pulse" aria-busy="true" aria-label="Loading">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-brand-border rounded-xl p-4 space-y-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
      {/* Content blocks */}
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-56 w-full rounded-xl" />
    </div>
  )
}

// ─── Guard ────────────────────────────────────────────────────────────────────

interface AffiliateAuthGuardProps {
  children: React.ReactNode
}

export function AffiliateAuthGuard({ children }: AffiliateAuthGuardProps) {
  const router = useRouter()

  const { user, token }             = useAuthStore()
  const { affiliate, fetchStatus, fetchAffiliate } = useAffiliateStore()

  const [guardState, setGuardState] = useState<GuardState>('checking')

  useEffect(() => {
    // ── Step 1: must be logged in ──────────────────────────────────────────
    if (!user) {
      setGuardState('redirecting')
      router.replace('/account?next=/affiliate/dashboard')
      return
    }

    if (!token) {
      // token still rehydrating — keep checking
      return
    }

    // ── Step 2: check affiliate record ────────────────────────────────────
    // If the store already has a ready result, use it immediately
    if (fetchStatus === 'ready' && affiliate) {
      if (affiliate.status === 'approved') {
        setGuardState('authorized')
      } else {
        setGuardState('redirecting')
        router.replace(`/affiliate/apply?reason=${affiliate.status}`)
      }
      return
    }

    // ── Step 3: fetch affiliate profile ────────────────────────────────────
    if (fetchStatus === 'idle') {
      fetchAffiliate(token).then(() => {
        // Re-read from store after fetch completes
        const { affiliate: aff, fetchStatus: fs } = useAffiliateStore.getState()

        if (fs === 'error') {
          // fetchAffiliate sets fetchError — read it to decide the redirect
          const err = useAffiliateStore.getState().fetchError ?? ''
          const isNotFound = err.toLowerCase().includes('not found') ||
                             err.toLowerCase().includes('404')
          setGuardState('redirecting')
          router.replace(
            isNotFound
              ? '/affiliate/apply?reason=not-found'
              : '/affiliate/apply?reason=error',
          )
          return
        }

        if (aff?.status === 'approved') {
          setGuardState('authorized')
        } else {
          setGuardState('redirecting')
          router.replace(`/affiliate/apply?reason=${aff?.status ?? 'unknown'}`)
        }
      })
    }
  }, [user, token, affiliate, fetchStatus, fetchAffiliate, router])

  if (guardState === 'checking' || guardState === 'redirecting') {
    return (
      <div className="flex-1 flex">
        <DashboardSkeleton />
      </div>
    )
  }

  return <>{children}</>
}
