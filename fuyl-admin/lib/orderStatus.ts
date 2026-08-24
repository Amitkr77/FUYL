export type OrderStatus =
  | 'pending' | 'confirmed' | 'ready_to_ship' | 'on_hold'
  | 'shipped' | 'in_transit' | 'out_for_delivery'
  | 'delivered' | 'closed' | 'cancelled'
  | 'packed' | 'dispatched' | 'completed' | 'returned'

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Payment Pending', confirmed: 'Confirmed', ready_to_ship: 'Ready to Ship',
  on_hold: 'On Hold', shipped: 'Shipped', in_transit: 'In Transit',
  out_for_delivery: 'Out for Delivery', delivered: 'Delivered', closed: 'Closed',
  cancelled: 'Cancelled', packed: 'Ready to Ship (legacy)',
  dispatched: 'Shipped (legacy)', completed: 'Closed (legacy)', returned: 'Returned (legacy)',
}

export const STATUS_FLOW: OrderStatus[] = [
  'confirmed', 'ready_to_ship', 'shipped', 'in_transit', 'out_for_delivery', 'delivered',
]

export const MANUAL_STATUS_OPTIONS: OrderStatus[] = [
  'pending', 'confirmed', 'ready_to_ship', 'on_hold', 'shipped',
  'in_transit', 'out_for_delivery', 'delivered', 'closed', 'cancelled',
]

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['ready_to_ship', 'on_hold', 'cancelled'],
  ready_to_ship: ['shipped', 'on_hold', 'cancelled'],
  on_hold: ['confirmed', 'ready_to_ship', 'cancelled'],
  shipped: ['in_transit'], in_transit: ['out_for_delivery'],
  out_for_delivery: ['delivered'], delivered: [], closed: [], cancelled: [], returned: [],
  packed: ['ready_to_ship'], dispatched: ['shipped'], completed: [],
}
