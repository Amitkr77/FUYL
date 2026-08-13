'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Coins,
  Wallet,
  Megaphone,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const TABS = [
  { label: 'Dashboard',  href: '/affiliate/dashboard',            icon: LayoutDashboard, exact: true  },
  { label: 'Commission', href: '/affiliate/dashboard/commission', icon: Coins,           exact: false },
  { label: 'Payments',   href: '/affiliate/dashboard/payments',   icon: Wallet,          exact: false },
  { label: 'Marketing',  href: '/affiliate/dashboard/marketing',  icon: Megaphone,       exact: false },
  { label: 'Settings',   href: '/affiliate/dashboard/settings',   icon: Settings,        exact: false },
] as const

function isActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname.startsWith(href)
}

export function AffiliateBottomBar() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Affiliate sections"
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 flex items-stretch bg-brand-forest border-t border-white/10 pb-[env(safe-area-inset-bottom)]"
    >
      {TABS.map(({ label, href, icon: Icon, exact }) => {
        const active = isActive(pathname, href, exact)
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className="flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-colors"
          >
            <span
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
                active ? 'bg-brand-teal text-white' : 'text-brand-sage/60',
              )}
            >
              <Icon size={18} />
            </span>
            <span
              className={cn(
                'text-[9px] font-semibold tracking-wide uppercase',
                active ? 'text-white' : 'text-brand-sage/50',
              )}
            >
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
