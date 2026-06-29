'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User } from '@/types/user'
import { login as apiLogin, register as apiRegister } from '@/lib/api/account'

interface AuthState {
  user:       User | null
  token:      string | null
  isLoading:  boolean
  error:      string | null
  // Actions
  login:      (email: string, password: string) => Promise<void>
  register:   (payload: { firstName: string; lastName: string; email: string; password: string; phone?: string }) => Promise<void>
  logout:     () => void
  clearError: () => void
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
          const { token, user } = await apiLogin({ email, password })
          set({ token, user })
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
          const { token, user } = await apiRegister(payload)
          set({ token, user })
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Registration failed. Please try again.'
          set({ error: message })
        } finally {
          set({ isLoading: false })
        }
      },

      logout:     () => set({ user: null, token: null }),
      clearError: () => set({ error: null }),
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
