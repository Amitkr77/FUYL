// Split out of lib/orders.ts on purpose — that module imports adminApiFetch
// (server-only, needs next/headers via lib/auth.ts), so any Client Component
// that needs a real (non-type) value from it, not just a type, pulls that
// whole server-only chain into the client bundle and fails to build. This
// file has zero imports, so OrderStatusPanel.tsx (a Client Component) can
// import MANUAL_STATUS_OPTIONS from here instead.

export type OrderStatus =
  | 'pending' | 'confirmed' | 'packed'
  | 'dispatched' | 'in_transit' | 'shipped'
  | 'delivered' | 'completed' | 'cancelled' | 'returned'

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending:    'Pending',
  confirmed:  'Confirmed',
  packed:     'Packed',
  dispatched: 'Dispatched',
  in_transit: 'In Transit',
  shipped:    'Shipped',
  delivered:  'Delivered',
  completed:  'Completed',
  cancelled:  'Cancelled',
  returned:   'Returned',
}

// Happy-path customer-facing flow (shown in the progress bar)
export const STATUS_FLOW: OrderStatus[] = [
  'confirmed', 'dispatched', 'in_transit', 'delivered',
]

// All statuses PATCH /admin/orders/:id/status accepts
// ('returned' is never settable manually; 'cancelled' goes through the cancel endpoint)
export const MANUAL_STATUS_OPTIONS: OrderStatus[] = [
  'pending', 'confirmed', 'packed', 'dispatched', 'in_transit',
  'shipped', 'delivered', 'completed', 'cancelled',
]
