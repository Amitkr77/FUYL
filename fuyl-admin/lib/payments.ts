import { adminApiFetch } from './api'

export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded' | 'partially_refunded'
export type PaymentMethod = 'cashfree' | 'razorpay' | 'upi' | 'cod' | 'wallet' | 'split'

interface BackendPayment {
  _id: string
  paymentNumber: string
  orderId: string
  customerId: string
  amount: number
  currency: string
  method: PaymentMethod
  status: PaymentStatus
  gateway: string
  failureReason?: string
  attemptedAt: string
  capturedAt?: string
  refundedAt?: string
  refundedAmount: number
  cfOrderId?: string
  cfPaymentId?: string
}

export interface Payment {
  id: string
  paymentNumber: string
  orderId: string
  customerId: string
  amount: number
  currency: string
  method: PaymentMethod
  status: PaymentStatus
  gateway: string
  failureReason?: string
  attemptedAt: string
  capturedAt?: string
  refundedAt?: string
  refundedAmount: number
  cfOrderId?: string
  cfPaymentId?: string
}

export interface PaymentStats {
  totalPayments: number
  successCount: number
  failedCount: number
  refundedCount: number
  totalAmount: number
}

function mapPayment(p: BackendPayment): Payment {
  return {
    id:            p._id,
    paymentNumber: p.paymentNumber,
    orderId:       p.orderId,
    customerId:    p.customerId,
    amount:        p.amount,
    currency:      p.currency,
    method:        p.method,
    status:        p.status,
    gateway:       p.gateway,
    failureReason: p.failureReason,
    attemptedAt:   p.attemptedAt,
    capturedAt:    p.capturedAt,
    refundedAt:    p.refundedAt,
    refundedAmount: p.refundedAmount,
    cfOrderId:     p.cfOrderId,
    cfPaymentId:   p.cfPaymentId,
  }
}

export async function listPayments(): Promise<Payment[]> {
  const raw = await adminApiFetch<BackendPayment[]>('/admin/payments?limit=100')
  return raw.map(mapPayment)
}

export async function getPaymentStats(): Promise<PaymentStats> {
  return adminApiFetch<PaymentStats>('/admin/payments/stats')
}
