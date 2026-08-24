import { z } from 'zod';
import { OrderStatus, PaymentMethod } from '../../../shared/enums';
import { phoneSchema } from '../../../shared/validators';

export const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().length(24),
    variantId: z.string().length(24).optional(),
    quantity: z.number().int().min(1).max(99),
  })).min(1),
  shippingAddress: z.object({
    fullName: z.string().min(1).max(100),
    phone: phoneSchema,
    line1: z.string().min(1).max(200),
    line2: z.string().max(200).optional(),
    city: z.string().min(1).max(100),
    state: z.string().min(1).max(100),
    pincode: z.string().min(3).max(20),
    country: z.string().min(2).max(2),
    type: z.enum(['home', 'office', 'other']).default('home'),
  }),
  billingAddress: z.object({
    fullName: z.string().min(1).max(100),
    phone: phoneSchema,
    line1: z.string().min(1).max(200),
    line2: z.string().max(200).optional(),
    city: z.string().min(1).max(100),
    state: z.string().min(1).max(100),
    pincode: z.string().min(3).max(20),
    country: z.string().min(2).max(2),
    type: z.enum(['home', 'office', 'other']).default('home'),
  }),
  paymentMethod: z.enum([PaymentMethod.CASHFREE, PaymentMethod.RAZORPAY, PaymentMethod.UPI, PaymentMethod.COD, PaymentMethod.WALLET, PaymentMethod.LOYALTY, PaymentMethod.SPLIT]),
  // Shipping charge computed by the checkout service (Shiprocket rate). Optional
  // so direct order creation without a rate still works (defaults to 0).
  shippingTotal: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum([
    OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.READY_TO_SHIP,
    OrderStatus.ON_HOLD, OrderStatus.SHIPPED, OrderStatus.IN_TRANSIT,
    OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED, OrderStatus.CLOSED,
    OrderStatus.CANCELLED,
  ]),
  note: z.string().max(500).optional(),
  trackingNumber: z.string().max(100).optional(),
  trackingUrl: z.string().url().optional(),
  carrier: z.string().max(100).optional(),
}).superRefine((value, ctx) => {
  if (value.status === OrderStatus.SHIPPED) {
    if (!value.carrier?.trim()) ctx.addIssue({ code: 'custom', path: ['carrier'], message: 'Courier service is required when shipping an order' });
    if (!value.trackingNumber?.trim()) ctx.addIssue({ code: 'custom', path: ['trackingNumber'], message: 'Tracking number is required when shipping an order' });
    if (!value.trackingUrl) ctx.addIssue({ code: 'custom', path: ['trackingUrl'], message: 'Tracking link is required when shipping an order' });
  }
  if (value.status === OrderStatus.ON_HOLD && !value.note?.trim()) {
    ctx.addIssue({ code: 'custom', path: ['note'], message: 'A reason is required when placing an order on hold' });
  }
});

export const cancelOrderSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const updateAdminNotesSchema = z.object({
  adminNotes: z.string().max(5000),
});

export const createReturnSchema = z.object({
  orderId: z.string().length(24),
  items: z.array(z.object({
    productId: z.string().length(24),
    variantId: z.string().length(24).optional(),
    quantity: z.number().int().min(1),
    reason: z.string().min(1).max(500),
    reasonDetails: z.string().max(2000).optional(),
    // At least one photo of the seal-damaged product is required as proof of
    // the refund claim (enforced here; the seal-damaged condition itself is
    // enforced in order.service.createReturn).
    images: z.array(z.string().url()).min(1).max(5),
    condition: z.enum(['unopened', 'opened', 'damaged']).default('damaged'),
  })).min(1),
  refundMethod: z.enum(['wallet', 'original', 'split']).default('wallet'),
});

export const updateReturnSchema = z.object({
  status: z.enum(['requested', 'approved', 'rejected', 'pickup_scheduled', 'picked_up', 'in_transit', 'received', 'verified', 'refund_processing', 'refunded', 'cancelled']),
  rejectedReason: z.string().max(500).optional(),
  note: z.string().max(500).optional(),
});

export type CreateOrderDTO = z.infer<typeof createOrderSchema>;
export type UpdateStatusDTO = z.infer<typeof updateStatusSchema>;
export type CancelOrderDTO = z.infer<typeof cancelOrderSchema>;
export type CreateReturnDTO = z.infer<typeof createReturnSchema>;
export type UpdateReturnDTO = z.infer<typeof updateReturnSchema>;
