import { type ReactNode } from 'react'

interface FormSectionProps {
  title?: string
  description?: string
  children: ReactNode
  className?: string
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <section className={`bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4 ${className ?? ''}`}>
      {(title || description) && (
        <div>
          {title && <h3 className="text-sm font-semibold text-slate-900">{title}</h3>}
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
      )}
      {children}
    </section>
  )
}
