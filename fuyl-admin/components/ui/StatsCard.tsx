import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  change?: string
  changeLabel?: string
  iconColor?: string
  iconBg?: string
}

export default function StatsCard({
  icon: Icon,
  label,
  value,
  change,
  changeLabel = 'vs last month',
  iconColor = 'text-[#558476]',
  iconBg = 'bg-[#558476]/10',
}: StatsCardProps) {
  const changeNum = change ? parseFloat(change) : null
  const isPositive = changeNum !== null && changeNum > 0
  const isNegative = changeNum !== null && changeNum < 0
  const isNeutral = changeNum === 0

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', iconBg)}>
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
        {change !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
              isPositive && 'text-emerald-700 bg-emerald-50',
              isNegative && 'text-rose-700 bg-rose-50',
              isNeutral && 'text-slate-500 bg-slate-100'
            )}
          >
            {isPositive && <TrendingUp className="w-3 h-3" />}
            {isNegative && <TrendingDown className="w-3 h-3" />}
            {isNeutral && <Minus className="w-3 h-3" />}
            {change}%
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 mb-0.5">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
        {changeLabel && change !== undefined && (
          <p className="text-xs text-slate-400 mt-1">{changeLabel}</p>
        )}
      </div>
    </div>
  )
}
