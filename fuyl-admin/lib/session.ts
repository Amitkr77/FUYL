import { SignJWT, jwtVerify } from 'jose'

// Edge-safe (jose works on the Edge runtime) — this file must stay free of
// `next/headers` so it can be imported from middleware.ts. Cookie
// read/write helpers that need `next/headers` live in lib/auth.ts instead.

// This secret signs the admin session cookie, which itself carries the
// backend's access + refresh tokens. A known/default value would let anyone
// forge a super_admin session AND obtain working backend credentials — so a
// missing JWT_SECRET must hard-fail rather than fall back to a public string.
const rawJwtSecret = process.env.JWT_SECRET
if (!rawJwtSecret) {
  throw new Error(
    '[admin] JWT_SECRET is required — refusing to start with an insecure default session secret'
  )
}
const JWT_SECRET = new TextEncoder().encode(rawJwtSecret)

export const SESSION_COOKIE = 'fuyl-admin-session'
// Matches the backend's refresh-token lifetime (JWT_REFRESH_EXPIRY=7d) — the
// local session shouldn't be able to outlive the refresh token it wraps.
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

export interface AdminSessionPayload {
  userId: string
  email: string
  role: 'admin' | 'super_admin'
  // Real fuyl-backend tokens, carried inside this app's own session cookie.
  // The backend's refresh token is only ever delivered via an httpOnly
  // cookie on the backend's own origin (sameSite=strict), which a separate
  // Next.js app can't rely on receiving — so it's captured once at login
  // (server-to-server, not subject to CORS) and stored here instead.
  accessToken:  string
  refreshToken: string
}

export async function signSession(payload: AdminSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(JWT_SECRET)
}

export async function verifySession(token: string): Promise<AdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as AdminSessionPayload
  } catch {
    return null
  }
}
