import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  sub?: string
  change?: string
  changeLabel?: string
  accent?: string   // tailwind bg-* class for the top accent strip
  iconColor?: string
  iconBg?: string
}

export default function StatsCard({
  icon: Icon,
  label,
  value,
  sub,
  change,
  changeLabel,
  accent = 'bg-[#558476]',
  iconColor = 'text-[#558476]',
  iconBg = 'bg-[#558476]/10',
}: StatsCardProps) {
  const changeNum = change ? parseFloat(change) : null
  const isPositive = changeNum !== null && changeNum > 0
  const isNegative = changeNum !== null && changeNum < 0

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-200">
      {/* Accent stripe */}
      <div className={cn('h-0.5', accent)} />

      <div className="p-5">
        <div className="flex items-start justify-between mb-5">
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
            <Icon className={cn('w-4.5 h-4.5', iconColor)} />
          </div>
          {changeNum !== null && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
                isPositive && 'bg-emerald-50 text-emerald-700',
                isNegative && 'bg-rose-50 text-rose-700',
                !isPositive && !isNegative && 'bg-slate-100 text-slate-500',
              )}
            >
              {isPositive && <TrendingUp className="w-3 h-3" />}
              {isNegative && <TrendingDown className="w-3 h-3" />}
              {isPositive ? '+' : ''}{change}%
            </span>
          )}
        </div>

        <p className="text-[28px] font-bold text-slate-900 leading-none tracking-tight">{value}</p>
        <p className="text-sm text-slate-500 mt-1.5">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        {changeLabel && changeNum !== null && (
          <p className="text-xs text-slate-400 mt-2">{changeLabel}</p>
        )}
      </div>
    </div>
  )
}
