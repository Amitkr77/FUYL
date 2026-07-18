'use server'

import { redirect } from 'next/navigation'
import { adminApiFetch, getErrorMessage } from '@/lib/api'
import { clearSessionCookie } from '@/lib/auth'

export type SettingsActionState = { error: string } | null

export async function changePasswordAction(currentPassword: string, newPassword: string): Promise<SettingsActionState> {
  try {
    await adminApiFetch('/auth/change-password', {
      method: 'POST',
      body:   { currentPassword, newPassword },
    })
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not change password.') }
  }

  // change-password revokes every refresh token for this user (including
  // the one embedded in this app's own session cookie) — the session is
  // dead the moment this call succeeds, so force a clean re-login rather
  // than showing "saved" on a session that no longer works.
  await clearSessionCookie()
  redirect('/login?passwordChanged=1')
}
