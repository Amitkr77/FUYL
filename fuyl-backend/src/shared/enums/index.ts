export const RoleEnum = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  STAFF: 'staff',
  CUSTOMER: 'customer',
} as const;

export const OrderStatus = {
  PENDING: 'pending',
  PAYMENT_FAILED: 'payment_failed',
  CONFIRMED: 'confirmed',
  READY_TO_SHIP: 'ready_to_ship',
  ON_HOLD: 'on_hold',
  IN_TRANSIT: 'in_transit',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CLOSED: 'closed',
  CANCELLED: 'cancelled',
  // Legacy values remain readable while existing data is migrated. New
  // transitions must never write them.
  PACKED: 'packed',
  DISPATCHED: 'dispatched',
  COMPLETED: 'completed',
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
  CASHFREE: 'cashfree',
  RAZORPAY: 'razorpay', // legacy — retained for historical orders
  UPI: 'upi',
  COD: 'cod',
  WALLET: 'wallet',
  LOYALTY: 'loyalty',
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

// ─── Affiliate ───────────────────────────────────────────────────────────────

export const AffiliateStatus = {
  PENDING:   'pending',
  APPROVED:  'approved',
  REJECTED:  'rejected',
  SUSPENDED: 'suspended',
} as const;

export const CommissionStatus = {
  PENDING:   'pending',
  APPROVED:  'approved',
  PAYABLE:   'payable',
  PAID:      'paid',
  CANCELLED: 'cancelled',
  REVERSED:  'reversed',
} as const;

export const AttributionMethod = {
  LINK:   'link',
  COUPON: 'coupon',
} as const;

export const CommissionEventType = {
  CREATED:    'created',
  APPROVED:   'approved',
  PAYABLE:    'payable',
  PAID:       'paid',
  CANCELLED:  'cancelled',
  REVERSED:   'reversed',
  ADJUSTED:   'adjusted',
} as const;

export type EnumOf<T extends Record<string, string>> = T[keyof T];
