'use server'

import { revalidatePath } from 'next/cache'
import { updateAdminOrderStatus, updateAdminOrderNotes, type StatusUpdateInput } from '@/lib/orders'
import { getErrorMessage } from '@/lib/api'

export type OrderActionState = { error: string } | { success: true }

export async function updateOrderStatusAction(id: string, input: StatusUpdateInput): Promise<OrderActionState> {
  try {
    await updateAdminOrderStatus(id, input)
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not update order status.') }
  }
  revalidatePath(`/orders/${id}`)
  revalidatePath('/orders')
  return { success: true }
}

export async function updateOrderNotesAction(id: string, adminNotes: string): Promise<OrderActionState> {
  try { await updateAdminOrderNotes(id, adminNotes) }
  catch (err) { return { error: getErrorMessage(err, 'Could not save internal note.') } }
  revalidatePath(`/orders/${id}`)
  return { success: true }
}
