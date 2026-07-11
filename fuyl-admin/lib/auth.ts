import { cookies } from 'next/headers'
import {
  signSession,
  verifySession,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  type AdminSessionPayload,
} from './session'

export type { AdminSessionPayload }

export async function getSession(): Promise<AdminSessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySession(token)
}

export async function setSessionCookie(payload: AdminSessionPayload): Promise<void> {
  const token = await signSession(payload)
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  })
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}
