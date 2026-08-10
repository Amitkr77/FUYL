'use server'

import { revalidatePath } from 'next/cache'
import { getErrorMessage } from '@/lib/api'
import {
  approveAffiliate,
  rejectAffiliate,
  suspendAffiliate,
  payoutAffiliate,
  approveCommission,
} from '@/lib/affiliate'

export async function approveAffiliateAction(id: string): Promise<{ error: string } | null> {
  try {
    await approveAffiliate(id)
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not approve affiliate.') }
  }
  revalidatePath('/affiliates')
  return null
}

export async function rejectAffiliateAction(id: string, reason: string): Promise<{ error: string } | null> {
  try {
    await rejectAffiliate(id, reason)
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not reject affiliate.') }
  }
  revalidatePath('/affiliates')
  return null
}

export async function suspendAffiliateAction(id: string, reason: string): Promise<{ error: string } | null> {
  try {
    await suspendAffiliate(id, reason)
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not suspend affiliate.') }
  }
  revalidatePath('/affiliates')
  return null
}

export async function payoutAffiliateAction(id: string): Promise<{ error: string } | null> {
  try {
    await payoutAffiliate(id)
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not process payout.') }
  }
  revalidatePath('/affiliates')
  return null
}

export async function approveCommissionAction(id: string): Promise<{ error: string } | null> {
  try {
    await approveCommission(id)
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not approve commission.') }
  }
  revalidatePath('/affiliates')
  return null
}
