'use server'

import { revalidatePath } from 'next/cache'
import { updateAdminOrderStatus, AdminApiError, type StatusUpdateInput } from '@/lib/orders'

export type OrderActionState = { error: string } | { success: true }

export async function updateOrderStatusAction(id: string, input: StatusUpdateInput): Promise<OrderActionState> {
  try {
    await updateAdminOrderStatus(id, input)
  } catch (err) {
    return { error: err instanceof AdminApiError ? err.message : 'Could not update order status.' }
  }
  revalidatePath(`/orders/${id}`)
  revalidatePath('/orders')
  return { success: true }
}
