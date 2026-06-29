import { z } from 'zod';
import { PaymentMethod } from '../../../shared/enums';

export const createPaymentSchema = z.object({
  orderId: z.string().length(24),
  method: z.enum([PaymentMethod.RAZORPAY, PaymentMethod.UPI, PaymentMethod.COD, PaymentMethod.WALLET]),
});

export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export const refundSchema = z.object({
  paymentId: z.string().length(24),
  amount: z.number().positive().optional(),
  reason: z.string().min(1).max(500),
});

export type CreatePaymentDTO = z.infer<typeof createPaymentSchema>;
export type VerifyPaymentDTO = z.infer<typeof verifyPaymentSchema>;
export type RefundDTO = z.infer<typeof refundSchema>;
