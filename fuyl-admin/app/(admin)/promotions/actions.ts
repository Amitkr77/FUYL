'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getErrorMessage } from '@/lib/api'
import {
  createCampaign,
  updateCampaignStatus,
  deleteCampaign,
  type CreateCampaignInput,
  type CampaignStatus,
} from '@/lib/promotions'

export type PromotionActionState = { error: string } | { success: true }

export async function createCampaignAction(input: CreateCampaignInput): Promise<{ error: string } | null> {
  try {
    await createCampaign(input)
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not create the campaign.') }
  }
  revalidatePath('/promotions')
  redirect('/promotions')
}

export async function updateCampaignStatusAction(id: string, status: CampaignStatus): Promise<PromotionActionState> {
  try {
    await updateCampaignStatus(id, { status })
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not update campaign status.') }
  }
  revalidatePath('/promotions')
  return { success: true }
}

export async function toggleFeaturedAction(id: string, isFeatured: boolean): Promise<PromotionActionState> {
  try {
    await updateCampaignStatus(id, { isFeatured })
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not update campaign.') }
  }
  revalidatePath('/promotions')
  return { success: true }
}

export async function deleteCampaignAction(id: string): Promise<PromotionActionState> {
  try {
    await deleteCampaign(id)
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not delete the campaign.') }
  }
  revalidatePath('/promotions')
  return { success: true }
}
