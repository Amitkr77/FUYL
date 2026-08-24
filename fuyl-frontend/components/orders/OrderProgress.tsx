import { Check } from 'lucide-react'

const STEPS = [
  { key: 'confirmed', label: 'Confirmed', desc: 'Order confirmed' },
  { key: 'ready_to_ship', label: 'Ready to Ship', desc: 'Prepared for pickup' },
  { key: 'shipped', label: 'Shipped', desc: 'Handed to courier' },
  { key: 'in_transit', label: 'In Transit', desc: 'Moving through the courier network' },
  { key: 'out_for_delivery', label: 'Out for Delivery', desc: 'Arriving today' },
  { key: 'delivered', label: 'Delivered', desc: 'Delivered to you' },
] as const

const STATUS_STEP: Record<string, number> = {
  pending: -1, payment_failed: -1, confirmed: 0, ready_to_ship: 1, packed: 1,
  shipped: 2, dispatched: 2, in_transit: 3, out_for_delivery: 4,
  delivered: 5, completed: 5, closed: 5,
}

export function OrderProgress({ status }: { status: string }) {
  const current = STATUS_STEP[status] ?? -1
  return (
    <div>
      <p className="text-label text-brand-muted mb-5">Delivery Progress</p>
      <div className="flex items-start overflow-x-auto pb-2">
        {STEPS.map((step, i) => {
          const done = i <= current
          const isCurrent = i === current
          return <div key={step.key} className="min-w-[105px] flex-1 flex flex-col items-center relative">
            {i < STEPS.length - 1 && <div className="absolute top-4 left-1/2 w-full h-0.5 z-0"
              style={{ background: i < current ? 'var(--color-brand-teal)' : 'var(--color-brand-border)' }} />}
            <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 ${done ? 'bg-brand-teal border-brand-teal text-white' : 'bg-white border-brand-border'} ${isCurrent ? 'ring-4 ring-brand-teal/15' : ''}`}>
              {done ? <Check size={14} strokeWidth={3} /> : <span className="text-[11px] font-semibold text-brand-muted">{i + 1}</span>}
            </div>
            <div className="mt-2.5 text-center px-1">
              <span className={`block text-[11px] font-bold leading-tight ${done ? 'text-brand-forest' : 'text-brand-muted'}`}>{step.label}</span>
              <span className="block text-[10px] text-brand-muted/70 leading-tight mt-0.5">{step.desc}</span>
            </div>
          </div>
        })}
      </div>
    </div>
  )
}
