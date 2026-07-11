'use server'

import { redirect } from 'next/navigation'
import { setSessionCookie } from '@/lib/auth'

const API_URL = process.env.API_URL || 'http://localhost:4000/api/v1'
const ADMIN_ROLES = ['admin', 'super_admin']

export async function login(
  prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  let res: Response
  try {
    res = await fetch(`${API_URL}/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
      cache:   'no-store',
    })
  } catch {
    return { error: 'Could not reach the server. Please try again.' }
  }

  const text = await res.text()
  // Backend returns raw Mongoose documents — the user's id field is `_id`,
  // not `id` (no `id` virtual is exposed by User.toJSON()). This was read
  // as `user.id` below, which was always undefined, so every admin session
  // was created with userId: undefined — silently breaking anything that
  // reads it (e.g. lib/products.ts's requireSellerId(), used when creating
  // or updating a product, meaning sellerId was omitted from every product
  // create/update request the admin UI ever sent).
  let json: { data?: { user: { _id: string; email: string; role: string }; accessToken: string }; error?: { message?: string } } | null = null
  try { json = text ? JSON.parse(text) : null } catch { /* non-JSON body */ }

  if (!res.ok || !json?.data) {
    return { error: json?.error?.message ?? 'Invalid email or password.' }
  }

  const { user, accessToken } = json.data

  if (!ADMIN_ROLES.includes(user.role)) {
    return { error: 'This account does not have admin access.' }
  }

  // The refresh token is only ever delivered via Set-Cookie on the backend's
  // own origin (sameSite=strict) — captured here server-to-server rather
  // than relying on the browser to forward a cross-origin cookie, which
  // strict SameSite would block anyway.
  const setCookieHeaders = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : [res.headers.get('set-cookie') ?? '']
  const refreshCookie = setCookieHeaders.find((c) => c.startsWith('fuyl_refresh='))
  const refreshToken = refreshCookie?.split(';')[0]?.split('=')[1]

  if (!refreshToken) {
    return { error: 'Login succeeded but no session could be established. Please try again.' }
  }

  await setSessionCookie({
    userId:  user._id,
    email:   user.email,
    role:    user.role as 'admin' | 'super_admin',
    accessToken,
    refreshToken,
  })

  redirect('/dashboard')
}
