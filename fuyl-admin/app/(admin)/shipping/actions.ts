'use server'

import { revalidatePath } from 'next/cache'
import { updateShipmentStatus, syncShipmentTracking, createShipment, reattemptShipment, type ShipmentStatus, type CreateShipmentInput } from '@/lib/shipping'
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

export async function syncShipmentTrackingAction(id: string): Promise<ShippingActionState> {
  try {
    await syncShipmentTracking(id)
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not sync tracking from the carrier.') }
  }
  revalidatePath('/shipping')
  return { success: true }
}

export async function reattemptShipmentAction(id: string): Promise<ShippingActionState> {
  try {
    await reattemptShipment(id)
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not request a re-attempt.') }
  }
  revalidatePath('/shipping')
  return { success: true }
}

export async function createShipmentAction(input: CreateShipmentInput): Promise<ShippingActionState> {
  try {
    await createShipment(input)
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not book the shipment.') }
  }
  revalidatePath(`/orders/${input.orderId}`)
  revalidatePath('/shipping')
  return { success: true }
}
