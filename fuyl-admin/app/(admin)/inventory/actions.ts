'use server'

import { revalidatePath } from 'next/cache'
import { adjustStock, type AdjustStockInput } from '@/lib/inventory'
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
