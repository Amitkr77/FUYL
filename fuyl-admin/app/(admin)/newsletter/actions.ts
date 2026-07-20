'use server'

import { revalidatePath } from 'next/cache'
import { getErrorMessage } from '@/lib/api'
import { resendSubscriberVerification, deleteSubscriber } from '@/lib/newsletter'

export type NewsletterActionState = { error: string } | { success: true }

export async function resendVerificationAction(email: string): Promise<NewsletterActionState> {
  try {
    await resendSubscriberVerification(email)
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not resend the confirmation email.') }
  }
  revalidatePath('/newsletter')
  return { success: true }
}

export async function deleteSubscriberAction(id: string): Promise<NewsletterActionState> {
  try {
    await deleteSubscriber(id)
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not delete the subscriber.') }
  }
  revalidatePath('/newsletter')
  return { success: true }
}
