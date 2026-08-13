import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface StatsCardProps {
  label:      string
  value:      string
  icon:       LucideIcon
  sub?:       string      // optional subtitle / trend
  accent?:    boolean     // highlight card (e.g. total commission)
  className?: string
}

export function StatsCard({ label, value, icon: Icon, sub, accent, className }: StatsCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl p-4 border flex flex-col gap-3',
        accent
          ? 'bg-brand-forest border-brand-forest text-white'
          : 'bg-white border-brand-border',
        className,
      )}
    >
      <div className={cn('flex items-center gap-1.5', accent ? 'text-brand-sage/70' : 'text-brand-muted')}>
        <Icon size={13} />
        <p className="text-[11px] font-semibold uppercase tracking-wide">{label}</p>
      </div>
      <p className={cn('text-display-md font-display', accent ? 'text-white' : 'text-brand-forest')}>
        {value}
      </p>
      {sub && (
        <p className={cn('text-body-xs', accent ? 'text-brand-sage/60' : 'text-brand-muted')}>
          {sub}
        </p>
      )}
    </div>
  )
}
