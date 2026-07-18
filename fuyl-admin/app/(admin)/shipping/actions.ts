'use server'

import { revalidatePath } from 'next/cache'
import { updateShipmentStatus, type ShipmentStatus } from '@/lib/shipping'
import { getErrorMessage } from '@/lib/api'

export type ShippingActionState = { error: string } | { success: true }

export async function updateShipmentStatusAction(id: string, status: ShipmentStatus): Promise<ShippingActionState> {
  try {
    await updateShipmentStatus(id, status)
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not update shipment status.') }
  }
  revalidatePath('/shipping')
  return { success: true }
}
