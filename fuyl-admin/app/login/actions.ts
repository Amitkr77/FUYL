'use server'

import { SignJWT } from 'jose'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fuyl-admin-secret-2024'
)

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@fuyl.in'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'fuyl@admin2024'

export async function login(
  prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return { error: 'Invalid email or password.' }
  }

  const token = await new SignJWT({ email, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)

  const cookieStore = await cookies()
  cookieStore.set('fuyl-admin-session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  redirect('/dashboard')
}
