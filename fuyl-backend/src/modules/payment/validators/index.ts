import { z } from 'zod';
import { PaymentMethod } from '../../../shared/enums';

export const createPaymentSchema = z.object({
  orderId: z.string().length(24),
  method: z.enum([PaymentMethod.CASHFREE, PaymentMethod.COD, PaymentMethod.WALLET]),
});

// Cashfree has no client-side signature — the client sends back the Cashfree
// order id (our payment number) and the server confirms via a status fetch.
export const verifyPaymentSchema = z.object({
  cfOrderId: z.string().min(1),
});

export const refundSchema = z.object({
  paymentId: z.string().length(24),
  amount: z.number().positive().optional(),
  reason: z.string().min(1).max(500),
});

export type CreatePaymentDTO = z.infer<typeof createPaymentSchema>;
export type VerifyPaymentDTO = z.infer<typeof verifyPaymentSchema>;
export type RefundDTO = z.infer<typeof refundSchema>;
