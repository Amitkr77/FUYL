'use server'

import { revalidatePath } from 'next/cache'
import { adjustWallet, setWalletFrozen, AdminApiError } from '@/lib/wallet'

export type WalletActionState = { error: string } | { success: true }

export async function adjustWalletAction(input: {
  userId: string
  amount: number
  type: 'credit' | 'debit'
  description: string
}): Promise<WalletActionState> {
  try {
    await adjustWallet(input)
  } catch (err) {
    return { error: err instanceof AdminApiError ? err.message : 'Could not adjust wallet.' }
  }
  revalidatePath(`/wallet/${input.userId}`)
  return { success: true }
}

export async function setWalletFrozenAction(userId: string, frozen: boolean, reason?: string): Promise<WalletActionState> {
  try {
    await setWalletFrozen(userId, frozen, reason)
  } catch (err) {
    return { error: err instanceof AdminApiError ? err.message : 'Could not update wallet freeze status.' }
  }
  revalidatePath(`/wallet/${userId}`)
  return { success: true }
}
