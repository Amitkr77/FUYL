'use server'

import { redirect } from 'next/navigation'
import { getSession, clearSessionCookie } from '@/lib/auth'

const API_URL = process.env.API_URL || 'http://localhost:4000/api/v1'

export async function logout() {
  const session = await getSession()
  if (session) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${session.accessToken}`,
        },
        body:  JSON.stringify({ refreshToken: session.refreshToken }),
        cache: 'no-store',
      })
    } catch {
      // Best-effort — proceed to clear the local session regardless.
    }
  }
  await clearSessionCookie()
  redirect('/login')
}
