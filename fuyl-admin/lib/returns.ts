import { adminApiFetch, AdminApiError } from './api'

export type ReturnStatus =
  | 'requested' | 'approved' | 'rejected' | 'pickup_scheduled'
  | 'picked_up' | 'received' | 'refunded' | 'cancelled'

interface BackendReturn {
  _id: string
  returnNumber: string
  orderId: string
  customerId: string
  items: Array<{ productId: string; quantity: number; reason: string; condition: string }>
  status: ReturnStatus
  refundAmount: number
  refundMethod: 'wallet' | 'original' | 'split'
  requestedAt: string
  rejectedReason?: string
}

export interface ReturnRequest {
  id: string
  returnNumber: string
  orderId: string
  customerId: string
  itemCount: number
  reason: string
  status: ReturnStatus
  refundAmount: number
  refundMethod: 'wallet' | 'original' | 'split'
  requestedAt: string
  rejectedReason?: string
}

function mapReturn(r: BackendReturn): ReturnRequest {
  return {
    id: r._id, returnNumber: r.returnNumber, orderId: r.orderId, customerId: r.customerId,
    itemCount: r.items.reduce((sum, i) => sum + i.quantity, 0),
    reason: r.items[0]?.reason ?? '',
    status: r.status, refundAmount: r.refundAmount, refundMethod: r.refundMethod,
    requestedAt: r.requestedAt, rejectedReason: r.rejectedReason,
  }
}

export async function listReturns(): Promise<ReturnRequest[]> {
  const raw = await adminApiFetch<BackendReturn[]>('/admin/orders/returns?limit=100')
  return raw.map(mapReturn)
}

export async function updateReturnStatus(id: string, status: ReturnStatus, rejectedReason?: string): Promise<void> {
  await adminApiFetch(`/admin/orders/returns/${id}`, {
    method: 'PATCH',
    body: { status, rejectedReason },
  })
}

export { AdminApiError }
