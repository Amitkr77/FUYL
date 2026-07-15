'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User } from '@/types/user'
import { login as apiLogin, register as apiRegister } from '@/lib/api/account'
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
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
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
          const message = err instanceof Error ? err.message : 'Login failed. Please try again.'
          set({ error: message })
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
          const message = err instanceof Error ? err.message : 'Registration failed. Please try again.'
          set({ error: message })
        } finally {
          set({ isLoading: false })
        }
      },

      logout:     () => set({ user: null, token: null }),
      clearError: () => set({ error: null }),
      setUser:    (user) => set({ user }),
      setSession: (token, user) => set({ token, user, error: null }),
    }),
    {
      name:       'fuyl_auth',
      storage:    createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
)

// Convenience selector — use outside store to check login
export const isLoggedIn = () => !!useAuthStore.getState().token
