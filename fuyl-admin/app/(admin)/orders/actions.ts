'use server'

import { revalidatePath } from 'next/cache'
import { addAdminOrderComment, updateAdminOrderStatus, type StatusUpdateInput } from '@/lib/orders'
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

export async function addOrderCommentAction(id: string, message: string): Promise<OrderActionState> {
  try { await addAdminOrderComment(id, message) }
  catch (err) { return { error: getErrorMessage(err, 'Could not post comment.') } }
  revalidatePath(`/orders/${id}`)
  return { success: true }
}
