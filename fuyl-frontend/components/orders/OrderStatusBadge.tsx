// Single source of truth for order-status presentation (label + colors),
// shared by the orders list and the order detail page.
export const ORDER_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Pending',   color: '#B45309', bg: '#FEF3C7' },
  confirmed: { label: 'Confirmed', color: '#1D4ED8', bg: '#DBEAFE' },
  packed:    { label: 'Packed',    color: '#1D4ED8', bg: '#DBEAFE' },
  shipped:   { label: 'Shipped',   color: '#0F766E', bg: '#CCFBF1' },
  delivered: { label: 'Delivered', color: '#047857', bg: '#D1FAE5' },
  completed: { label: 'Completed', color: '#047857', bg: '#D1FAE5' },
  cancelled: { label: 'Cancelled', color: '#B91C1C', bg: '#FEE2E2' },
  returned:  { label: 'Returned',  color: '#6B7280', bg: '#F3F4F6' },
}

function meta(status: string) {
  return ORDER_STATUS_META[status] ?? { label: status, color: '#6B7280', bg: '#F3F4F6' }
}

export function OrderStatusBadge({ status, size = 'sm' }: { status: string; size?: 'sm' | 'md' }) {
  const m = meta(status)
  const pad = size === 'md' ? 'px-3 py-1.5 text-body-xs' : 'px-2.5 py-1 text-[11px]'
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold uppercase tracking-wide rounded-full ${pad}`}
      style={{ color: m.color, background: m.bg }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.color }} />
      {m.label}
    </span>
  )
}
