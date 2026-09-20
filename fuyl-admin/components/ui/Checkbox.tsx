'use client'

import { type InputHTMLAttributes } from 'react'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  description?: string
}

export function Checkbox({ label, description, className, ...props }: CheckboxProps) {
  return (
    <label className={`group flex items-start gap-3 cursor-pointer ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className ?? ''}`}>
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-[#558476] transition-colors focus:ring-2 focus:ring-[#558476] focus:ring-offset-1 disabled:cursor-not-allowed"
        {...props}
      />
      <span>
        <span className="block text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
          {label}
        </span>
        {description && (
          <span className="block text-xs text-slate-400 mt-0.5">{description}</span>
        )}
      </span>
    </label>
  )
}
