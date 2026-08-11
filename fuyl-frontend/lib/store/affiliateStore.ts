'use client'

import { create } from 'zustand'
import { getAffiliateMe, type AffiliateProfile, type AffiliateStatus } from '@/lib/api/affiliate'

// ─── State shape ─────────────────────────────────────────────────────────────

type FetchStatus = 'idle' | 'loading' | 'ready' | 'error'

interface AffiliateState {
  affiliate:   AffiliateProfile | null
  fetchStatus: FetchStatus
  fetchError:  string | null

  // Actions
  fetchAffiliate: (token: string) => Promise<void>
  setAffiliate:   (affiliate: AffiliateProfile) => void
  clear:          () => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

// Not persisted — re-fetched on each dashboard session. Keeping it in memory
// (not localStorage) means sensitive payment info is never written to disk.
export const useAffiliateStore = create<AffiliateState>((set, get) => ({
  affiliate:   null,
  fetchStatus: 'idle',
  fetchError:  null,

  fetchAffiliate: async (token: string) => {
    // Avoid duplicate in-flight requests if the guard mounts twice
    if (get().fetchStatus === 'loading') return

    set({ fetchStatus: 'loading', fetchError: null })
    try {
      const affiliate = await getAffiliateMe(token)
      set({ affiliate, fetchStatus: 'ready' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not load affiliate profile'
      set({ fetchStatus: 'error', fetchError: msg })
    }
  },

  setAffiliate: (affiliate) => set({ affiliate, fetchStatus: 'ready' }),

  clear: () => set({ affiliate: null, fetchStatus: 'idle', fetchError: null }),
}))

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectAffiliateStatus = (): AffiliateStatus | null =>
  useAffiliateStore.getState().affiliate?.status ?? null

export const selectIsApproved = (): boolean =>
  useAffiliateStore.getState().affiliate?.status === 'approved'
