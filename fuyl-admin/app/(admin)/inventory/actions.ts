'use server'

import { revalidatePath } from 'next/cache'
import {
  adjustStock, listLocations, createLocation, updateLocation, deleteLocation, migrateLegacyDefault,
  type AdjustStockInput, type WarehouseLocation,
} from '@/lib/inventory'
import { getErrorMessage } from '@/lib/api'

export type InventoryActionState = { error: string } | { success: true }

export async function adjustStockAction(input: AdjustStockInput): Promise<InventoryActionState> {
  try {
    await adjustStock(input)
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not adjust stock.') }
  }
  revalidatePath('/inventory')
  return { success: true }
}

// ─── Location actions (used by LocationManager client component) ──────────────

export async function listLocationsAction(): Promise<WarehouseLocation[]> {
  return listLocations()
}

export async function createLocationAction(
  data: { name: string; code: string; address?: WarehouseLocation['address']; isDefault?: boolean }
): Promise<WarehouseLocation | { error: string }> {
  try {
    const loc = await createLocation(data)
    revalidatePath('/inventory')
    return loc
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not create location.') }
  }
}

export async function updateLocationAction(
  id: string,
  data: Partial<WarehouseLocation>
): Promise<WarehouseLocation | { error: string }> {
  try {
    const loc = await updateLocation(id, data)
    revalidatePath('/inventory')
    return loc
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not update location.') }
  }
}

export async function deleteLocationAction(id: string): Promise<{ success: true } | { error: string }> {
  try {
    await deleteLocation(id)
    revalidatePath('/inventory')
    return { success: true }
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not delete location.') }
  }
}

export async function migrateLegacyDefaultAction(): Promise<{ migratedCount: number; warehouseCode: string } | { error: string }> {
  try {
    const result = await migrateLegacyDefault()
    revalidatePath('/inventory')
    return result
  } catch (err) {
    return { error: getErrorMessage(err, 'Migration failed.') }
  }
}
