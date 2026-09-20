import { forwardRef, type TextareaHTMLAttributes } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  helperText?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, helperText, error, className, id, ...props }, ref) => {
    const textareaId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className={className}>
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-slate-700 mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`w-full px-3 py-2.5 rounded-lg border bg-slate-50 text-slate-900 text-sm placeholder:text-slate-400 resize-none transition-colors focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${
            error ? 'border-red-300 bg-red-50/30' : 'border-slate-200'
          }`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-slate-400">{helperText}</p>}
      </div>
    )
  },
)

Textarea.displayName = 'Textarea'
