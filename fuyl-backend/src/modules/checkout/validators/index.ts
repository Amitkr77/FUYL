import { z } from 'zod';

// Matches fuyl-backend/src/modules/order/models/order.model.ts's
// OrderAddressSchema exactly — checkout passes this straight through to
// orderService.create() with no transformation, so the two must agree
// field-for-field (fullName/pincode are required there).
const checkoutAddressSchema = z.object({
  fullName: z.string().min(1).max(120),
  phone: z.string().min(1).max(20),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  pincode: z.string().min(3).max(20),
  country: z.string().min(2).max(3).default('IN'),
  type: z.enum(['home', 'office', 'other']).default('home'),
});

export const checkoutSchema = z.object({
  cartId: z.string().length(24).optional(),         // optional if using user's active cart
  shippingAddressId: z.string().length(24).optional(),  // from customer profile
  shippingAddress: checkoutAddressSchema.optional(),
  billingAddressId: z.string().length(24).optional(),
  billingAddress: checkoutAddressSchema.optional(),
  paymentMethod: z.enum(['razorpay', 'upi', 'cod', 'wallet', 'split']),
  couponCode: z.string().max(30).optional(),
  referralCode: z.string().max(50).optional(),
  razorpayPaymentId: z.string().optional(),
  razorpayOrderId: z.string().optional(),
  razorpaySignature: z.string().optional(),
  walletRedemptionAmount: z.number().min(0).optional(),   // for split: amount to debit from wallet
  notes: z.string().max(500).optional(),
});

export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
});

export type CheckoutDTO = z.infer<typeof checkoutSchema>;
export type VerifyPaymentDTO = z.infer<typeof verifyPaymentSchema>;
