import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { SITE } from '@/lib/constants/site'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
  /** Use "dark" on light-text-on-dark-background heroes (e.g. bg-brand-forest). */
  variant?: 'light' | 'dark'
}

export function Breadcrumbs({ items, className, variant = 'light' }: BreadcrumbsProps) {
  const trail: BreadcrumbItem[] = [{ label: 'Home', href: '/' }, ...items]

  const muted    = variant === 'dark' ? 'text-white/50' : 'text-brand-muted'
  const current  = variant === 'dark' ? 'text-white font-medium' : 'text-brand-forest font-medium'
  const hover    = variant === 'dark' ? 'hover:text-white' : 'hover:text-brand-teal'
  const chevron  = variant === 'dark' ? 'text-white/25' : 'text-brand-border'

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: `${SITE.url}${item.href}` } : {}),
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <nav aria-label="Breadcrumb" className={className}>
        <ol className={`flex flex-wrap items-center gap-1.5 text-body-xs ${muted}`}>
          {trail.map((item, i) => {
            const isLast = i === trail.length - 1
            return (
              <li key={item.href ?? item.label} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight size={12} className={`${chevron} shrink-0`} />}
                {item.href && !isLast ? (
                  <Link href={item.href} className={`transition-colors ${hover}`}>
                    {item.label}
                  </Link>
                ) : (
                  <span className={isLast ? current : ''}>{item.label}</span>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}
