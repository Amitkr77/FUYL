import type { CustomerReturn } from '@/lib/api/account'

const FLOW = ['requested', 'approved', 'pickup_scheduled', 'picked_up', 'in_transit', 'received', 'verified', 'refund_processing', 'refunded'] as const
const LABEL: Record<string, string> = {
  requested: 'Requested', approved: 'Approved', pickup_scheduled: 'Pickup Scheduled',
  picked_up: 'Picked Up', in_transit: 'In Transit', received: 'Received',
  verified: 'Verified', refund_processing: 'Refund Processing', refunded: 'Refunded',
  rejected: 'Rejected', cancelled: 'Cancelled',
}

export function ReturnProgress({ value }: { value: CustomerReturn }) {
  const current = FLOW.indexOf(value.status as (typeof FLOW)[number])
  return <div className="rounded-2xl border border-brand-border p-5 sm:p-6">
    <div className="flex items-center justify-between gap-3 mb-4">
      <p className="text-label text-brand-muted">Return Progress · {value.returnNumber}</p>
      <span className="text-body-xs font-semibold text-brand-forest">{LABEL[value.status]}</span>
    </div>
    {current >= 0 ? <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
      {FLOW.map((step, index) => <div key={step} className={`h-2 rounded-full ${index <= current ? 'bg-brand-teal' : 'bg-brand-border'}`} title={LABEL[step]} />)}
    </div> : <p className="text-body-sm text-brand-muted">This return was {LABEL[value.status].toLowerCase()}.</p>}
    <p className="text-body-xs text-brand-muted mt-3">Delivery progress remains separate and does not advance during a return.</p>
  </div>
}
