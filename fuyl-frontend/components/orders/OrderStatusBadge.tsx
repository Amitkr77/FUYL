// Single source of truth for order-status presentation on the customer side.
// Statuses are mapped to the 4 customer-visible stages:
// Confirmed → Dispatched → In Transit → Delivered
// Legacy values (packed, shipped) are silently remapped so old orders still look right.
export const ORDER_STATUS_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending:    { label: 'Processing',  color: '#92400E', bg: '#FFFBEB', dot: '#D97706' },
  confirmed:  { label: 'Confirmed',   color: '#1E40AF', bg: '#EFF6FF', dot: '#3B82F6' },
  packed:     { label: 'Confirmed',   color: '#1E40AF', bg: '#EFF6FF', dot: '#3B82F6' },
  dispatched: { label: 'Dispatched',  color: '#075985', bg: '#E0F2FE', dot: '#0EA5E9' },
  shipped:    { label: 'Dispatched',  color: '#075985', bg: '#E0F2FE', dot: '#0EA5E9' },
  in_transit: { label: 'In Transit',  color: '#065F46', bg: '#ECFDF5', dot: '#10B981' },
  delivered:  { label: 'Delivered',   color: '#14532D', bg: '#F0FDF4', dot: '#22C55E' },
  completed:  { label: 'Delivered',   color: '#14532D', bg: '#F0FDF4', dot: '#22C55E' },
  cancelled:  { label: 'Cancelled',   color: '#991B1B', bg: '#FEF2F2', dot: '#EF4444' },
  returned:   { label: 'Returned',    color: '#374151', bg: '#F9FAFB', dot: '#9CA3AF' },
}

function meta(status: string) {
  return ORDER_STATUS_META[status] ?? { label: status, color: '#6B7280', bg: '#F3F4F6', dot: '#9CA3AF' }
}

export function OrderStatusBadge({ status, size = 'sm' }: { status: string; size?: 'sm' | 'md' }) {
  const m = meta(status)
  const cls = size === 'md'
    ? 'px-3 py-1.5 text-xs gap-1.5'
    : 'px-2.5 py-1 text-[11px] gap-1'
  return (
    <span
      className={`inline-flex items-center font-semibold uppercase tracking-wide rounded-full ${cls}`}
      style={{ color: m.color, background: m.bg }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: m.dot }} />
      {m.label}
    </span>
  )
}
