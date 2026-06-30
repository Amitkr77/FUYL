'use client'

import { useCountdown } from '@/lib/hooks/useCountdown'
import { cn } from '@/lib/utils/cn'

interface CountdownProps {
  targetDate: string | Date
  className?: string
}

export function Countdown({ targetDate, className }: CountdownProps) {
  const { days, hours, minutes, seconds } = useCountdown(targetDate)

  const units = [
    { label: 'Days',    value: days    },
    { label: 'Hours',   value: hours   },
    { label: 'Minutes', value: minutes },
    { label: 'Seconds', value: seconds },
  ]

  return (
    <div className={cn('flex items-center gap-3 sm:gap-6 md:gap-8', className)}>
      {units.map(({ label, value }) => (
        <div key={label} className="flex flex-col items-center gap-1">
          <span className="text-3xl sm:text-display-lg font-display tabular-nums" suppressHydrationWarning>
            {String(value).padStart(2, '0')}
          </span>
          <span className="text-label text-brand-teal">{label}</span>
        </div>
      ))}
    </div>
  )
}
