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

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const { accessToken, user } = await apiLogin({ email, password })
          set({ token: accessToken, user })
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
          set({ token: accessToken, user })
          await useCartStore.getState().mergeGuestCart()
        } catch (err: unknown) {
          set({ error: getErrorMessage(err, 'Registration failed. Please try again.') })
        } finally {
          set({ isLoading: false })
        }
      },

      logout:     () => set({ user: null, token: null }),
      clearError: () => set({ error: null }),
      setUser:    (user) => set({ user }),
      setSession: (token, user) => set({ token, user, error: null }),

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
      storage:    createJSONStorage(() => localStorage),
      // Persist BOTH the access token and the user. Keeping the token out of
      // localStorage (memory-only) made session continuity depend entirely on
      // the /auth/refresh cookie, which isn't reliably sent across the payment
      // gateway return (refresh cookie is sameSite=strict) — that logged users
      // out after completing checkout. Persisting the token restores continuity
      // across reloads/redirects. (XSS exposure is mitigated by the storefront
      // HTML sanitizer + CSP.) rehydrate() below stays as a no-op safety net:
      // it only acts when a user is present but the token is somehow missing.
      partialize: (state) => ({ token: state.token, user: state.user }),
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
