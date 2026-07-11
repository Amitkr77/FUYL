import { Truck, RotateCcw, ShieldCheck } from 'lucide-react'

// Static informational copy — there's no pincode/courier ETA engine on the
// backend (shipping module only stores a per-order estimatedDeliveryDate
// after a shipment is created, nothing computable ahead of purchase), so
// this mirrors the same dispatch/delivery wording already used elsewhere on
// the storefront rather than fabricating a live calculation.
export function DeliveryInfo() {
  const rows = [
    { icon: Truck,       title: 'Dispatched within 1 working day', body: 'Delivered in 3–5 business days across India.' },
    { icon: RotateCcw,   title: '30-Day Money-Back Guarantee',      body: "If you don't feel the difference, we'll refund you." },
    { icon: ShieldCheck, title: 'FSSAI Certified',                  body: 'Manufactured in a certified facility.' },
  ]

  return (
    <div className="flex flex-col gap-3 border-t pt-5" style={{ borderColor: 'var(--color-brand-border)' }}>
      {rows.map(({ icon: Icon, title, body }) => (
        <div key={title} className="flex items-start gap-3">
          <Icon size={16} className="mt-0.5 shrink-0 text-brand-teal" />
          <div>
            <p className="text-body-sm font-medium text-brand-forest">{title}</p>
            <p className="text-body-xs" style={{ color: 'var(--color-brand-muted)' }}>{body}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
