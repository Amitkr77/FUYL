'use client'

import { cn } from '@/lib/utils/cn'

export interface Tab<T extends string = string> {
  key:    T
  label:  string
  count?: number   // optional badge count e.g. "Commissions (12)"
}

interface TabBarProps<T extends string = string> {
  tabs:       Tab<T>[]
  active:     T
  onChange:   (key: T) => void
  className?: string
  size?:      'sm' | 'md'
}

export function TabBar<T extends string = string>({
  tabs,
  active,
  onChange,
  className,
  size = 'md',
}: TabBarProps<T>) {
  return (
    <div
      className={cn(
        'flex border-b border-brand-border overflow-x-auto scrollbar-none',
        className,
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={cn(
              'relative shrink-0 font-semibold uppercase tracking-wider transition-colors whitespace-nowrap',
              size === 'sm'
                ? 'px-4 py-2.5 text-[10px]'
                : 'px-5 py-3 text-[11px]',
              isActive
                ? 'text-brand-forest'
                : 'text-brand-muted hover:text-brand-forest',
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  'ml-1.5 inline-flex items-center justify-center rounded-full px-1.5 py-px text-[9px] font-bold',
                  isActive
                    ? 'bg-brand-forest text-white'
                    : 'bg-brand-border text-brand-muted',
                )}
              >
                {tab.count}
              </span>
            )}
            {/* Active underline */}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-forest rounded-t-full" />
            )}
          </button>
        )
      })}
    </div>
  )
}
