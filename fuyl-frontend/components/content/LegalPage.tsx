import { ScrollReveal } from '@/components/ui/ScrollReveal'

interface Section {
  heading: string
  body:    string | string[]
}

interface LegalPageProps {
  title:       string
  subtitle?:   string
  lastUpdated: string
  sections:    Section[]
}

export function LegalPage({ title, subtitle, lastUpdated, sections }: LegalPageProps) {
  return (
    <>
      {/* Hero */}
      <section className="py-14" style={{ background: 'var(--color-brand-cream)' }}>
        <div className="container-brand max-w-3xl">
          <ScrollReveal>
            <p className="text-label mb-3" style={{ color: 'var(--color-brand-muted)' }}>
              Last updated: {lastUpdated}
            </p>
            <h1 className="text-display-xl font-display">{title.toUpperCase()}</h1>
            {subtitle && (
              <p className="text-body-lg mt-3" style={{ color: 'var(--color-brand-muted)' }}>{subtitle}</p>
            )}
          </ScrollReveal>
        </div>
      </section>

      {/* Content */}
      <section className="section-py" style={{ background: 'var(--color-brand-white)' }}>
        <div className="container-brand max-w-3xl">
          <div className="space-y-10">
            {sections.map(({ heading, body }, i) => (
              <ScrollReveal key={heading} delay={i * 40}>
                <div className="pb-10 border-b last:border-0" style={{ borderColor: 'var(--color-brand-border)' }}>
                  <h2 className="text-body-lg font-semibold mb-3">{heading}</h2>
                  {Array.isArray(body) ? (
                    <ul className="space-y-2">
                      {body.map((item, j) => (
                        <li key={j} className="flex items-start gap-2 text-body-md leading-relaxed" style={{ color: 'var(--color-brand-muted)' }}>
                          <span className="mt-2 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--color-brand-berry)' }} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-body-md leading-relaxed" style={{ color: 'var(--color-brand-muted)' }}>{body}</p>
                  )}
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
