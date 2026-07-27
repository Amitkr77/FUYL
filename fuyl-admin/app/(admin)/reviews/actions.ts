'use server'

import { revalidatePath } from 'next/cache'
import { moderateReview, type ReviewStatus } from '@/lib/reviews'
import { getErrorMessage } from '@/lib/api'

export type ReviewActionState = { error: string } | { success: true }

export async function moderateReviewAction(id: string, status: ReviewStatus, moderationNote?: string): Promise<ReviewActionState> {
  try {
    await moderateReview(id, status, moderationNote)
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not update this review.') }
  }
  revalidatePath('/reviews')
  return { success: true }
}
