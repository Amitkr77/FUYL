'use server'

import { revalidatePath } from 'next/cache'
import { updateReturnStatus, AdminApiError, type ReturnStatus } from '@/lib/returns'

export type ReturnActionState = { error: string } | { success: true }

export async function updateReturnStatusAction(id: string, status: ReturnStatus, rejectedReason?: string): Promise<ReturnActionState> {
  try {
    await updateReturnStatus(id, status, rejectedReason)
  } catch (err) {
    return { error: err instanceof AdminApiError ? err.message : 'Could not update the return.' }
  }
  revalidatePath('/returns')
  return { success: true }
}
