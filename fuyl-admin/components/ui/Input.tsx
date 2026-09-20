import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string
  helperText?: string
  error?: string
  prefix?: ReactNode
  suffix?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, prefix, suffix, className, id, ...props }, ref) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className={className}>
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 mb-1.5">
            {label}
          </label>
        )}
        <div
          className={`flex items-center rounded-lg border bg-slate-50 transition-colors focus-within:ring-2 focus-within:ring-[#558476] focus-within:border-transparent ${
            error ? 'border-red-300 bg-red-50/30' : 'border-slate-200'
          }`}
        >
          {prefix && (
            <span className="pl-3 text-sm text-slate-400 pointer-events-none select-none">{prefix}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full bg-transparent text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none ${
              prefix ? 'pl-1.5 pr-3 py-2.5' : suffix ? 'pl-3 pr-1.5 py-2.5' : 'px-3 py-2.5'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            {...props}
          />
          {suffix && (
            <span className="pr-3 text-sm text-slate-400 pointer-events-none select-none">{suffix}</span>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-slate-400">{helperText}</p>}
      </div>
    )
  },
)

Input.displayName = 'Input'
