'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Coins,
  Wallet,
  Megaphone,
  Settings,
  HelpCircle,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useAuthStore } from '@/lib/store/authStore'
import { useAffiliateStore } from '@/lib/store/affiliateStore'

const NAV_ITEMS = [
  { label: 'Dashboard',       href: '/affiliate/dashboard',            icon: LayoutDashboard, exact: true  },
  { label: 'Commission',      href: '/affiliate/dashboard/commission', icon: Coins,           exact: false },
  { label: 'Payments',        href: '/affiliate/dashboard/payments',   icon: Wallet,          exact: false },
  { label: 'Marketing Tools', href: '/affiliate/dashboard/marketing',  icon: Megaphone,       exact: false },
  { label: 'Settings',        href: '/affiliate/dashboard/settings',   icon: Settings,        exact: false },
] as const

function isActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname.startsWith(href)
}

export function AffiliateSidebar() {
  const pathname  = usePathname()
  const router    = useRouter()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    useAffiliateStore.getState().clear()
    router.push('/')
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-brand-forest min-h-screen sticky top-0 h-screen overflow-y-auto">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <Link href="/">
          <Image
            src="/logo.webp"
            alt="FUYL"
            width={80}
            height={32}
            className="object-contain brightness-0 invert"
          />
        </Link>
        <p className="text-[10px] tracking-[0.2em] text-brand-sage/60 uppercase mt-2">
          Affiliate Portal
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV_ITEMS.map(({ label, href, icon: Icon, exact }) => {
          const active = isActive(pathname, href, exact)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-body-sm font-semibold transition-colors',
                active
                  ? 'bg-white/15 text-white'
                  : 'text-brand-sage/70 hover:bg-white/8 hover:text-white',
              )}
            >
              <Icon size={16} className="shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom — support + logout */}
      <div className="px-3 py-4 border-t border-white/10 flex flex-col gap-1">
        <a
          href="mailto:admin@fuyl.in"
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-body-sm font-semibold text-brand-sage/70 hover:bg-white/8 hover:text-white transition-colors"
        >
          <HelpCircle size={16} className="shrink-0" />
          Support
        </a>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-body-sm font-semibold text-brand-sage/70 hover:bg-red-500/20 hover:text-red-300 transition-colors w-full text-left"
        >
          <LogOut size={16} className="shrink-0" />
          Logout
        </button>
      </div>
    </aside>
  )
}
