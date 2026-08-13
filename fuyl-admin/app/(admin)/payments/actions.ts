'use server'

import { revalidatePath } from 'next/cache'
import { adminApiFetch, getErrorMessage } from '@/lib/api'

export type RefundActionState = { error: string } | { success: true }

export async function refundPaymentAction(
  paymentId: string,
  reason: string,
  amount?: number,
): Promise<RefundActionState> {
  try {
    await adminApiFetch('/admin/payments/refund', {
      method: 'POST',
      body: {
        paymentId,
        reason,
        ...(amount != null ? { amount } : {}),
      },
    })
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not process the refund.') }
  }
  revalidatePath('/payments')
  return { success: true }
}
