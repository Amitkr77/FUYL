import { z } from 'zod';

export const createReviewSchema = z.object({
  productId: z.string().length(24),
  variantId: z.string().length(24).optional(),
  orderId: z.string().length(24).optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  body: z.string().min(5).max(5000),
  images: z.array(z.string().url()).max(5).optional(),
});

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().max(200).optional(),
  body: z.string().min(5).max(5000).optional(),
  images: z.array(z.string().url()).max(5).optional(),
});

export const sellerReplySchema = z.object({
  body: z.string().min(1).max(1000),
});

export const moderationSchema = z.object({
  status: z.enum(['approved', 'rejected', 'flagged']),
  moderationNote: z.string().max(500).optional(),
});

export type CreateReviewDTO = z.infer<typeof createReviewSchema>;
export type UpdateReviewDTO = z.infer<typeof updateReviewSchema>;
export type SellerReplyDTO = z.infer<typeof sellerReplySchema>;
export type ModerationDTO = z.infer<typeof moderationSchema>;
