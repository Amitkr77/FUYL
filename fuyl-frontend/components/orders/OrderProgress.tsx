import { Check } from 'lucide-react'

// Horizontal progress tracker for the happy-path order lifecycle. Returns null
// for cancelled/returned orders (those get a distinct banner instead of a
// misleading progress bar).
const STEPS = ['Placed', 'Confirmed', 'Packed', 'Shipped', 'Delivered'] as const

const STATUS_STEP: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  packed: 2,
  shipped: 3,
  delivered: 4,
  completed: 4,
}

export function OrderProgress({ status }: { status: string }) {
  const current = STATUS_STEP[status]
  if (current === undefined) return null

  const pct = (current / (STEPS.length - 1)) * 100

  return (
    <div className="relative pt-1">
      {/* track */}
      <div className="absolute left-0 right-0 top-[15px] h-0.5 bg-brand-border mx-[10%]" />
      <div
        className="absolute left-0 top-[15px] h-0.5 bg-brand-teal mx-[10%] transition-all duration-500"
        style={{ width: `calc(${pct}% - ${pct === 0 ? 0 : 0}px)`, maxWidth: '80%' }}
      />
      <div className="relative z-10 flex items-start justify-between">
        {STEPS.map((label, i) => {
          const done = i <= current
          const isCurrent = i === current
          return (
            <div key={label} className="flex flex-col items-center gap-2 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                  done ? 'bg-brand-teal border-brand-teal text-white' : 'bg-white border-brand-border text-brand-muted'
                } ${isCurrent ? 'ring-4 ring-brand-teal/15' : ''}`}
              >
                {done ? <Check size={15} strokeWidth={3} /> : <span className="text-[11px] font-semibold">{i + 1}</span>}
              </div>
              <span className={`text-[11px] font-semibold text-center ${done ? 'text-brand-forest' : 'text-brand-muted'}`}>
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
