'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getErrorMessage } from '@/lib/api'
import { createDiscount, updateDiscount, deleteDiscount, type CreateDiscountInput, type DiscountStatus } from '@/lib/discounts'

export type DiscountActionState = { error: string } | { success: true }
export async function createDiscountAction(input: CreateDiscountInput): Promise<{ error: string } | null> {
  try { await createDiscount(input) } catch (err) { return { error: getErrorMessage(err, 'Could not create the discount.') } }
  revalidatePath('/discounts-cashback')
  redirect('/discounts-cashback')
}
export async function updateDiscountStatusAction(id: string, status: DiscountStatus): Promise<DiscountActionState> {
  try { await updateDiscount(id, { status }) } catch (err) { return { error: getErrorMessage(err, 'Could not update discount status.') } }
  revalidatePath('/discounts-cashback')
  return { success: true }
}
export async function deleteDiscountAction(id: string): Promise<DiscountActionState> {
  try { await deleteDiscount(id) } catch (err) { return { error: getErrorMessage(err, 'Could not delete the discount.') } }
  revalidatePath('/discounts-cashback')
  return { success: true }
}
