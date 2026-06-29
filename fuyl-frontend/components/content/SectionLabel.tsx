// Reusable eyebrow label for content pages
interface SectionLabelProps { children: React.ReactNode }

export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <p className="text-label mb-3" style={{ color: 'var(--color-brand-berry)' }}>
      {children}
    </p>
  )
}
