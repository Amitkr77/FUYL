import { adminApiFetch, AdminApiError } from './api'

export type ShipmentStatus =
  | 'pending' | 'label_created' | 'picked_up' | 'in_transit'
  | 'out_for_delivery' | 'delivered' | 'failed' | 'returned_to_origin' | 'cancelled'

export interface ShippingStats {
  pending: number
  inTransit: number
  delivered: number
  failed: number
}

export async function getShippingStats(): Promise<ShippingStats> {
  return adminApiFetch<ShippingStats>('/admin/shipping/stats')
}

interface BackendShipment {
  _id: string
  shipmentNumber: string
  orderId: string
  carrier: string
  trackingNumber: string
  trackingUrl?: string
  status: ShipmentStatus
  shippingAddress: { fullName: string; city: string; state: string }
  createdAt: string
  deliveredAt?: string
}

export interface Shipment {
  id: string
  shipmentNumber: string
  orderId: string
  carrier: string
  trackingNumber: string
  trackingUrl?: string
  status: ShipmentStatus
  recipientName: string
  destination: string
  createdAt: string
  deliveredAt?: string
}

function mapShipment(s: BackendShipment): Shipment {
  return {
    id: s._id, shipmentNumber: s.shipmentNumber, orderId: s.orderId, carrier: s.carrier,
    trackingNumber: s.trackingNumber, trackingUrl: s.trackingUrl, status: s.status,
    recipientName: s.shippingAddress?.fullName ?? '—',
    destination: s.shippingAddress ? `${s.shippingAddress.city}, ${s.shippingAddress.state}` : '—',
    createdAt: s.createdAt, deliveredAt: s.deliveredAt,
  }
}

export async function listShipments(status?: ShipmentStatus): Promise<Shipment[]> {
  const qs = new URLSearchParams({ limit: '100' })
  if (status) qs.set('status', status)
  const raw = await adminApiFetch<BackendShipment[]>(`/admin/shipping?${qs.toString()}`)
  return raw.map(mapShipment)
}

export async function updateShipmentStatus(id: string, status: ShipmentStatus, note?: string): Promise<void> {
  await adminApiFetch(`/shipping/shipments/${id}/status`, { method: 'PATCH', body: { status, note } })
}

export { AdminApiError }
