'use server'

import { revalidatePath } from 'next/cache'
import { updateShipmentStatus, AdminApiError, type ShipmentStatus } from '@/lib/shipping'

export type ShippingActionState = { error: string } | { success: true }

export async function updateShipmentStatusAction(id: string, status: ShipmentStatus): Promise<ShippingActionState> {
  try {
    await updateShipmentStatus(id, status)
  } catch (err) {
    return { error: err instanceof AdminApiError ? err.message : 'Could not update shipment status.' }
  }
  revalidatePath('/shipping')
  return { success: true }
}
