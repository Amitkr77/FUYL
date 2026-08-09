import { Check } from 'lucide-react'

// Customer-facing order progress: shows only the 4 meaningful lifecycle steps.
// Legacy statuses (pending, packed, shipped) are mapped to their closest
// equivalent so old orders still render correctly.
const STEPS = [
  { key: 'confirmed',  label: 'Confirmed',  desc: 'Order received & confirmed' },
  { key: 'dispatched', label: 'Dispatched', desc: 'Packed and handed to courier' },
  { key: 'in_transit', label: 'In Transit', desc: 'Out for delivery' },
  { key: 'delivered',  label: 'Delivered',  desc: 'Delivered to you' },
] as const

// Maps every backend status to a step index (0–3).
// Legacy values (pending, packed, shipped) are collapsed to the closest step.
const STATUS_STEP: Record<string, number> = {
  pending:    -1,  // shouldn't appear after the payment fix, but handled gracefully
  confirmed:   0,
  packed:      0,  // legacy → confirmed
  dispatched:  1,
  shipped:     1,  // legacy → dispatched
  in_transit:  2,
  delivered:   3,
  completed:   3,
}

export function OrderProgress({ status }: { status: string }) {
  const current = STATUS_STEP[status] ?? -1
  if (current === undefined) return null

  return (
    <div>
      <p className="text-label text-brand-muted mb-5">Order Status</p>
      <div className="flex items-start">
        {STEPS.map((step, i) => {
          const done    = i <= current
          const isCurrent = i === current
          const isLast  = i === STEPS.length - 1

          return (
            <div key={step.key} className="flex-1 flex flex-col items-center relative">
              {/* Connector line */}
              {!isLast && (
                <div className="absolute top-4 left-1/2 w-full h-0.5 z-0"
                  style={{ background: i < current ? 'var(--color-brand-teal)' : 'var(--color-brand-border)' }}
                />
              )}

              {/* Circle */}
              <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                done
                  ? 'bg-brand-teal border-brand-teal text-white'
                  : 'bg-white border-brand-border'
              } ${isCurrent ? 'ring-4 ring-brand-teal/15 shadow-sm' : ''}`}>
                {done
                  ? <Check size={14} strokeWidth={3} />
                  : <span className="text-[11px] font-semibold text-brand-muted">{i + 1}</span>
                }
              </div>

              {/* Label + description */}
              <div className="mt-2.5 flex flex-col items-center text-center px-1">
                <span className={`text-[11px] font-bold leading-tight ${done ? 'text-brand-forest' : 'text-brand-muted'}`}>
                  {step.label}
                </span>
                <span className="text-[10px] text-brand-muted/70 leading-tight mt-0.5 hidden sm:block">
                  {step.desc}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
