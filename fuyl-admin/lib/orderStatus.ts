// Split out of lib/orders.ts on purpose — that module imports adminApiFetch
// (server-only, needs next/headers via lib/auth.ts), so any Client Component
// that needs a real (non-type) value from it, not just a type, pulls that
// whole server-only chain into the client bundle and fails to build. This
// file has zero imports, so OrderStatusPanel.tsx (a Client Component) can
// import MANUAL_STATUS_OPTIONS from here instead.

export type OrderStatus =
  | 'pending' | 'confirmed' | 'packed' | 'shipped' | 'delivered'
  | 'completed' | 'cancelled' | 'returned'

// Statuses PATCH /admin/orders/:id/status actually accepts (verified against
// updateStatusSchema) — 'returned' is never settable this way, and
// 'cancelled' is rejected there too (must go through the cancel endpoint,
// handled separately in updateAdminOrderStatus).
export const MANUAL_STATUS_OPTIONS: OrderStatus[] = [
  'pending', 'confirmed', 'packed', 'shipped', 'delivered', 'completed', 'cancelled',
]
