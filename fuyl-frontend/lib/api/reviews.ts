import { apiFetch } from './client'

export interface CreateReviewInput {
  productId: string
  variantId?: string
  orderId?: string
  rating: number
  title?: string
  body: string
  images?: string[]
}

// POST /reviews — always lands as status:'pending' server-side (see
// review.service.ts), regardless of what's sent here; isVerifiedPurchase is
// likewise decided server-side from orderId, never trusted from the client.
export async function createReview(token: string, input: CreateReviewInput): Promise<void> {
  await apiFetch('/reviews', {
    method: 'POST',
    token,
    body: input,
  })
}
