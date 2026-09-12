'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User } from '@/types/user'
import { login as apiLogin, register as apiRegister } from '@/lib/api/account'
import { getErrorMessage, tryRefreshToken } from '@/lib/api/client'
import { useCartStore } from './cartStore'

interface AuthState {
  user:       User | null
  token:      string | null
  isLoading:  boolean
  error:      string | null
  isAffiliateImpersonation: boolean
  // Actions
  login:      (email: string, password: string) => Promise<void>
  register:   (payload: { firstName: string; lastName: string; email: string; password: string; phone?: string; referralCode?: string }) => Promise<void>
  logout:     () => void
  clearError: () => void
  setUser:    (user: User) => void
  // Used by checkout's inline identify flow — the token/user there already
  // come from a resolved backend session (login/register/checkout-identify
  // all issue the same shape), so this just adopts it directly rather than
  // re-deriving it through login()/register() again.
  setSession: (token: string, user: User) => void
  setAffiliateImpersonation: (token:string,user:User)=>void
  exitAffiliateImpersonation:()=>void
  // Re-mint the in-memory access token from the httpOnly refresh cookie on a
  // fresh page load. The access token is NOT persisted (kept out of
  // localStorage to shrink the XSS blast radius) — only `user` is — so on
  // reload we exchange the refresh cookie for a new access token. If that
  // fails, the session is genuinely over and we clear `user`.
  rehydrate:  () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:      null,
      token:     null,
      isLoading: false,
      error:     null,
      isAffiliateImpersonation: false,

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const { accessToken, user } = await apiLogin({ email, password })
          set({ token: accessToken, user, isAffiliateImpersonation:false })
          await useCartStore.getState().mergeGuestCart()
        } catch (err: unknown) {
          set({ error: getErrorMessage(err, 'Login failed. Please try again.') })
        } finally {
          set({ isLoading: false })
        }
      },

      register: async (payload) => {
        set({ isLoading: true, error: null })
        try {
          const { accessToken, user } = await apiRegister(payload)
          set({ token: accessToken, user, isAffiliateImpersonation:false })
          await useCartStore.getState().mergeGuestCart()
        } catch (err: unknown) {
          set({ error: getErrorMessage(err, 'Registration failed. Please try again.') })
        } finally {
          set({ isLoading: false })
        }
      },

      logout:     () => set({ user: null, token: null, isAffiliateImpersonation:false }),
      clearError: () => set({ error: null }),
      setUser:    (user) => set({ user }),
      setSession: (token, user) => set({ token, user, error: null }),
      setAffiliateImpersonation:(token,user)=>set({token,user,error:null,isAffiliateImpersonation:true}),
      exitAffiliateImpersonation:()=>set({token:null,user:null,isAffiliateImpersonation:false}),

      rehydrate: async () => {
        // Only relevant when we believe we're logged in (persisted user) but
        // hold no in-memory token yet — i.e. a fresh load. Guests and
        // already-tokened sessions are no-ops.
        const { user, token } = get()
        if (!user || token) return
        const newToken = await tryRefreshToken()
        if (newToken) {
          set({ token: newToken })
        } else {
          // Refresh cookie gone/expired — the session is truly over.
          set({ user: null, token: null })
        }
      },
    }),
    {
      name:       'fuyl_auth',
      version:    2,
      storage:    createJSONStorage(() => localStorage),
      // Keep bearer credentials out of localStorage. Session continuity comes
      // from the httpOnly refresh cookie, which JavaScript and injected CMS
      // content cannot read. Affiliate impersonation is intentionally
      // memory-only as well because it is a short privileged session.
      partialize: (state) => ({ user: state.user }),
      // Version 1 persisted bearer tokens. Explicitly discard those legacy
      // fields during hydration instead of leaving old installations exposed.
      migrate: (persisted) => {
        const previous = persisted as Partial<AuthState> | undefined
        return { user: previous?.user ?? null, token: null, isAffiliateImpersonation: false }
      },
      // If the token didn't come back from storage but the user did, restore it
      // from the refresh cookie (defensive; normally the token is persisted).
      onRehydrateStorage: () => (state) => {
        if (state?.user && !state.token) void state.rehydrate()
      },
    }
  )
)

// Convenience selector — "logged in" is now keyed on the persisted user, not
// the in-memory token (which is briefly absent right after a reload while
// rehydrate() runs). This keeps logged-in UI stable across reloads.
export const isLoggedIn = () => !!useAuthStore.getState().user
