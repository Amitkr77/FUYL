'use server'

import { revalidatePath } from 'next/cache'
import {
  createLoyaltyConfig,
  updateLoyaltyConfig,
  adminAdjustLoyalty,
  type LoyaltyConfigInput,
} from '@/lib/loyalty'
import { getErrorMessage } from '@/lib/api'

export async function saveLoyaltyConfigAction(
  configId: string | null,
  data: LoyaltyConfigInput,
): Promise<{ error?: string }> {
  try {
    if (configId) {
      await updateLoyaltyConfig(configId, data)
    } else {
      await createLoyaltyConfig(data)
    }
    revalidatePath('/loyalty')
    return {}
  } catch (err) {
    return { error: getErrorMessage(err, 'Failed to save loyalty config.') }
  }
}

export async function adjustLoyaltyPointsAction(input: {
  userId: string
  points: number
  description: string
}): Promise<{ error?: string }> {
  try {
    await adminAdjustLoyalty(input)
    return {}
  } catch (err) {
    return { error: getErrorMessage(err, 'Failed to adjust points.') }
  }
}
