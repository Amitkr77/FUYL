'use client'

import { useAffiliateStore } from '@/lib/store/affiliateStore'
import { useAuthStore } from '@/lib/store/authStore'

/**
 * Convenience hook for affiliate dashboard pages.
 *
 * Returns the affiliate profile from the store along with the auth token.
 * Does NOT trigger a fetch — that is the responsibility of AffiliateAuthGuard
 * which runs once in the dashboard layout and populates the store.
 *
 * Usage:
 *   const { affiliate, token, isReady } = useAffiliate()
 */
export function useAffiliate() {
  const { affiliate, fetchStatus, fetchError } = useAffiliateStore()
  const token = useAuthStore((s) => s.token)

  return {
    affiliate,
    token:      token ?? '',
    isReady:    fetchStatus === 'ready',
    isLoading:  fetchStatus === 'loading',
    fetchError,
  }
}
