'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getErrorMessage } from '@/lib/api'
import {
  createCashbackPolicy,
  updateCashbackPolicy,
  deleteCashbackPolicy,
  type CreatePolicyInput,
} from '@/lib/cashback'
import { searchCustomers } from '@/lib/customers'
import type { AllowedUser } from '@/lib/cashback'

export type CashbackActionState = { error: string } | { success: true }

export async function createPolicyAction(input: CreatePolicyInput): Promise<{ error: string } | null> {
  try {
    await createCashbackPolicy(input)
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not create the policy.') }
  }
  revalidatePath('/discounts-cashback')
  redirect('/discounts-cashback?tab=cashback')
}

export async function updatePolicyAction(id: string, patch: Partial<CreatePolicyInput>): Promise<CashbackActionState> {
  try {
    await updateCashbackPolicy(id, patch)
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not update policy.') }
  }
  revalidatePath('/discounts-cashback')
  return { success: true }
}

export async function deletePolicyAction(id: string): Promise<CashbackActionState> {
  try {
    await deleteCashbackPolicy(id)
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not delete policy.') }
  }
  revalidatePath('/discounts-cashback')
  return { success: true }
}

export async function searchCustomersAction(query: string): Promise<AllowedUser[]> {
  try {
    const results = await searchCustomers(query, 10)
    return results.map((c) => ({ id: c.id, email: c.email, name: c.name }))
  } catch {
    return []
  }
}
