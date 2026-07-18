'use server'

import { revalidatePath } from 'next/cache'
import { updateReturnStatus, type ReturnStatus } from '@/lib/returns'
import { getErrorMessage } from '@/lib/api'

export type ReturnActionState = { error: string } | { success: true }

export async function updateReturnStatusAction(id: string, status: ReturnStatus, rejectedReason?: string): Promise<ReturnActionState> {
  try {
    await updateReturnStatus(id, status, rejectedReason)
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not update the return.') }
  }
  revalidatePath('/returns')
  return { success: true }
}
