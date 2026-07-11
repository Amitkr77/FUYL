'use server'

import { revalidatePath } from 'next/cache'
import { adjustStock, AdminApiError, type AdjustStockInput } from '@/lib/inventory'

export type InventoryActionState = { error: string } | { success: true }

export async function adjustStockAction(input: AdjustStockInput): Promise<InventoryActionState> {
  try {
    await adjustStock(input)
  } catch (err) {
    return { error: err instanceof AdminApiError ? err.message : 'Could not adjust stock.' }
  }
  revalidatePath('/inventory')
  return { success: true }
}
