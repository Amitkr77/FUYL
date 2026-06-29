import Link from 'next/link'
import { ScrollReveal } from '@/components/ui/ScrollReveal'

interface SciencePillarProps {
  n:          string
  title:      string
  body:       string
  ingredients:string[]
  study?:     { label: string; href: string }
  accent:     string
  bg:         string
  flip?:      boolean
}

export function SciencePillar({ n, title, body, ingredients, study, accent, bg, flip }: SciencePillarProps) {
  return (
    <ScrollReveal>
      <div
        className={`grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-16 items-center ${flip ? 'lg:grid-flow-dense' : ''}`}
      >
        {/* Number block */}
        <div className={`flex flex-col justify-center p-10 rounded-sm aspect-square max-w-sm mx-auto w-full ${flip ? 'lg:col-start-2' : ''}`} style={{ background: bg }}>
          <span className="text-[8rem] font-display leading-none font-bold" style={{ color: accent, opacity: 0.15 }}>
            {n}
          </span>
          <p className="text-display-lg font-display mt-4 leading-tight">{title}</p>
          <p className="text-body-sm mt-3" style={{ color: 'var(--color-brand-muted)' }}>
            Key ingredients:
          </p>
          <ul className="mt-2 space-y-1">
            {ingredients.map((ing) => (
              <li key={ing} className="flex items-center gap-2 text-body-sm">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accent }} />
                {ing}
              </li>
            ))}
          </ul>
        </div>

        {/* Copy */}
        <div className={flip ? 'lg:col-start-1 lg:row-start-1' : ''}>
          <p className="text-label mb-3" style={{ color: accent }}>Health Pillar {n}</p>
          <h3 className="text-display-lg font-display mb-4">{title.toUpperCase()}</h3>
          <p className="text-body-lg leading-relaxed" style={{ color: 'var(--color-brand-muted)' }}>{body}</p>
          {study && (
            <Link
              href={study.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-5 text-body-sm font-semibold transition-colors hover:gap-2"
              style={{ color: accent }}
            >
              {study.label} →
            </Link>
          )}
        </div>
      </div>
    </ScrollReveal>
  )
}
