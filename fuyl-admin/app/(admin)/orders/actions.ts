'use server'

import { revalidatePath } from 'next/cache'
import { updateAdminOrderStatus, type StatusUpdateInput } from '@/lib/orders'
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
