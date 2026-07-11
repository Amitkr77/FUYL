export const RoleEnum = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  SELLER: 'seller',
  CUSTOMER: 'customer',
} as const;

export const OrderStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PACKED: 'packed',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  RETURNED: 'returned',
} as const;

export const ProductStatus = {
  ACTIVE: 'active',
  DRAFT: 'draft',
  ARCHIVED: 'archived',
} as const;

export const PaymentStatus = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
} as const;

export const PaymentMethod = {
  RAZORPAY: 'razorpay',
  UPI: 'upi',
  COD: 'cod',
  WALLET: 'wallet',
  SPLIT: 'split',
} as const;

export const SubscriptionStatus = {
  PENDING: 'pending',
  ACTIVE: 'active',
  PAUSED: 'paused',
  PAST_DUE: 'past_due',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
} as const;

export const SubscriptionInterval = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  BIWEEKLY: 'biweekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  CUSTOM: 'custom',
} as const;

export const ReferralStatus = {
  SHARED: 'shared',
  APPLIED: 'applied',
  PENDING: 'pending',
  ELIGIBLE: 'eligible',
  REWARDED: 'rewarded',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
} as const;

export const RewardType = {
  WALLET_CREDIT: 'wallet_credit',
  COUPON: 'coupon',
  CASHBACK: 'cashback',
} as const;

export const FraudReason = {
  DEVICE_MATCH: 'device_match',
  IP_MATCH: 'ip_match',
  PHONE_MATCH: 'phone_match',
  UPI_MATCH: 'upi_match',
  RAPID_PATTERN: 'rapid_pattern',
} as const;

export const NotificationChannel = {
  EMAIL: 'email',
  SMS: 'sms',
  WHATSAPP: 'whatsapp',
  PUSH: 'push',
} as const;

export const ShipmentStatus = {
  PENDING: 'pending',               // shipment record created, not yet handed to carrier
  LABEL_CREATED: 'label_created',
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  RETURNED_TO_ORIGIN: 'returned_to_origin',
  CANCELLED: 'cancelled',
} as const;

export type EnumOf<T extends Record<string, string>> = T[keyof T];
