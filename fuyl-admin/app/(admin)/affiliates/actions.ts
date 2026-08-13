'use server'

import { revalidatePath } from 'next/cache'
import { getErrorMessage } from '@/lib/api'
import {
  approveAffiliate,
  rejectAffiliate,
  suspendAffiliate,
  payoutAffiliate,
  approveCommission,
  createAffiliate,
  reactivateAffiliate,
  updateAffiliate,
  createAffiliateProgram,
  updateAffiliateProgram,
  setDefaultAffiliateProgram,
  deleteAffiliateProgram,
  type AffiliateProgramInput,
  bulkApproveCommissions,
  voidCommission,
  updateAffiliatePayout,
  updateAffiliateSettings,
  updateAffiliateReview,
  createAdminAffiliateLink,
  updateAdminAffiliateLink,
  type AffiliateSettings,
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

export async function saveAffiliateSettingsAction(input:AffiliateSettings):Promise<{error?:string}>{try{await updateAffiliateSettings(input);revalidatePath('/affiliates/settings');return{}}catch(err){return{error:getErrorMessage(err,'Could not save affiliate settings.')}}}
export async function saveAffiliateReviewAction(id:string,input:{internalNote?:string;fraudStatus?:'clear'|'review'|'blocked';fraudNote?:string}):Promise<{error?:string}>{try{await updateAffiliateReview(id,input);revalidatePath(`/affiliates/members/${id}`);return{}}catch(err){return{error:getErrorMessage(err,'Could not save affiliate review.')}}}
export async function createAffiliateLinkAction(id:string,input:{destination:string;label?:string}):Promise<{error?:string}>{try{await createAdminAffiliateLink(id,input);revalidatePath(`/affiliates/members/${id}`);return{}}catch(err){return{error:getErrorMessage(err,'Could not create tracking link.')}}}
export async function toggleAffiliateLinkAction(id:string,linkId:string,isActive:boolean):Promise<{error?:string}>{try{await updateAdminAffiliateLink(id,linkId,{isActive});revalidatePath(`/affiliates/members/${id}`);return{}}catch(err){return{error:getErrorMessage(err,'Could not update tracking link.')}}}

export async function bulkApproveCommissionsAction(ids: string[]): Promise<{ error?: string; approved?: number; failed?: number }> { try { const result=await bulkApproveCommissions(ids); revalidatePath('/affiliates/commissions'); return result } catch(err){return{error:getErrorMessage(err,'Could not approve commissions.')}} }
export async function voidCommissionAction(id:string,reason:string):Promise<{error?:string}>{try{await voidCommission(id,reason);revalidatePath('/affiliates/commissions');return{}}catch(err){return{error:getErrorMessage(err,'Could not update commission.')}}}
export async function updateAffiliatePayoutAction(id:string,input:{status:'processing'|'paid'|'failed';providerRef?:string;failureReason?:string}):Promise<{error?:string}>{try{await updateAffiliatePayout(id,input);revalidatePath('/affiliates/payouts');return{}}catch(err){return{error:getErrorMessage(err,'Could not update payout.')}}}

export async function saveAffiliateProgramAction(id: string | null, input: AffiliateProgramInput): Promise<{ error?: string; id?: string }> {
  try { const program = id ? await updateAffiliateProgram(id, input) : await createAffiliateProgram(input); revalidatePath('/affiliates/programs'); return { id: program._id } }
  catch (err) { return { error: getErrorMessage(err, 'Could not save affiliate program.') } }
}
export async function setDefaultAffiliateProgramAction(id: string): Promise<{ error?: string }> { try { await setDefaultAffiliateProgram(id); revalidatePath('/affiliates/programs'); return {} } catch (err) { return { error: getErrorMessage(err, 'Could not set default program.') } } }
export async function deleteAffiliateProgramAction(id: string): Promise<{ error?: string }> { try { await deleteAffiliateProgram(id); revalidatePath('/affiliates/programs'); return {} } catch (err) { return { error: getErrorMessage(err, 'Could not delete program.') } } }

export async function createAffiliateAction(input: { name: string; email: string; phone?: string; channels?: string[]; status?: 'pending' | 'approved' }): Promise<{ error?: string; id?: string }> {
  try {
    const affiliate = await createAffiliate(input)
    revalidatePath('/affiliates')
    return { id: affiliate.id }
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not create affiliate.') }
  }
}

export async function reactivateAffiliateAction(id: string): Promise<{ error: string } | null> {
  try { await reactivateAffiliate(id) } catch (err) { return { error: getErrorMessage(err, 'Could not reactivate affiliate.') } }
  revalidatePath('/affiliates')
  return null
}

export async function updateAffiliateAction(id: string, input: { name?: string; phone?: string; channels?: string[]; paymentInfo?: { upi?: string; bankAccount?: string; ifsc?: string; accountName?: string } }): Promise<{ error: string } | null> {
  try { await updateAffiliate(id, input) } catch (err) { return { error: getErrorMessage(err, 'Could not update affiliate.') } }
  revalidatePath(`/affiliates/members/${id}`)
  revalidatePath('/affiliates/members')
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
