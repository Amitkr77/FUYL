'use client'

import Link from 'next/link'
import { NavItem } from '@/lib/constants/nav'

interface MegaMenuProps {
  items:   NavItem[]
  onClose: () => void
}

export function MegaMenu({ items, onClose }: MegaMenuProps) {
  return (
    <div
      className="absolute top-full left-0 mt-0 bg-white border border-brand-border shadow-lg min-w-50 py-2 z-40 animate-fade-in"
      style={{ boxShadow: '0 8px 24px rgba(18,41,31,0.10)' }}
      onMouseLeave={onClose}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          target={item.external ? '_blank' : undefined}
          rel={item.external ? 'noopener noreferrer' : undefined}
          onClick={onClose}
          className="block px-5 py-3 text-body-sm font-semibold uppercase tracking-wider text-brand-forest hover:text-brand-teal hover:bg-brand-cream transition-colors duration-150"
        >
          {item.label}
        </Link>
      ))}
    </div>
  )
}
