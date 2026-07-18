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
  paymentMethod: z.enum([PaymentMethod.RAZORPAY, PaymentMethod.UPI, PaymentMethod.COD, PaymentMethod.WALLET, PaymentMethod.SPLIT]),
  notes: z.string().max(500).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum([
    OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PACKED,
    OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.COMPLETED, OrderStatus.CANCELLED,
  ]),
  note: z.string().max(500).optional(),
  trackingNumber: z.string().max(100).optional(),
  trackingUrl: z.string().url().optional(),
  carrier: z.string().max(100).optional(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const createReturnSchema = z.object({
  orderId: z.string().length(24),
  items: z.array(z.object({
    productId: z.string().length(24),
    variantId: z.string().length(24).optional(),
    quantity: z.number().int().min(1),
    reason: z.string().min(1).max(500),
    reasonDetails: z.string().max(2000).optional(),
    images: z.array(z.string().url()).max(5).optional(),
    condition: z.enum(['unopened', 'opened', 'damaged']).default('unopened'),
  })).min(1),
  refundMethod: z.enum(['wallet', 'original', 'split']).default('wallet'),
});

export const updateReturnSchema = z.object({
  status: z.enum(['requested', 'approved', 'rejected', 'pickup_scheduled', 'picked_up', 'received', 'refunded', 'cancelled']),
  rejectedReason: z.string().max(500).optional(),
  note: z.string().max(500).optional(),
});

export type CreateOrderDTO = z.infer<typeof createOrderSchema>;
export type UpdateStatusDTO = z.infer<typeof updateStatusSchema>;
export type CancelOrderDTO = z.infer<typeof cancelOrderSchema>;
export type CreateReturnDTO = z.infer<typeof createReturnSchema>;
export type UpdateReturnDTO = z.infer<typeof updateReturnSchema>;
