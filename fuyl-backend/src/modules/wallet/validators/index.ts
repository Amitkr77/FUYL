import { z } from 'zod';

export const adjustBalanceSchema = z.object({
  userId: z.string().length(24),
  amount: z.number().refine((n) => n !== 0, 'Amount must be non-zero'),
  type: z.enum(['credit', 'debit']),
  source: z.enum(['admin_adjustment', 'topup', 'withdrawal', 'promotion', 'gift_card']),
  description: z.string().min(1).max(500),
  referenceType: z.string().optional(),
  referenceId: z.string().length(24).optional(),
  expiresAt: z.coerce.date().optional(),
});

export const freezeWalletSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const transferSchema = z.object({
  fromUserId: z.string().length(24),
  toUserId: z.string().length(24),
  amount: z.number().positive(),
  description: z.string().min(1).max(500).optional(),
});

export type AdjustBalanceDTO = z.infer<typeof adjustBalanceSchema>;
export type FreezeWalletDTO = z.infer<typeof freezeWalletSchema>;
export type TransferDTO = z.infer<typeof transferSchema>;
