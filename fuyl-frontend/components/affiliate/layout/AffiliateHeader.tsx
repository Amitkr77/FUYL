'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  Menu,
  X,
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

export function AffiliateHeader() {
  const [open, setOpen]  = useState(false)
  const pathname          = usePathname()
  const router            = useRouter()
  const { user, logout }  = useAuthStore()

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase()

  const handleLogout = () => {
    setOpen(false)
    logout()
    useAffiliateStore.getState().clear()
    router.push('/')
  }

  return (
    <>
      {/* Top bar — mobile only */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-brand-forest border-b border-white/10 sticky top-0 z-30">
        <Link href="/">
          <Image
            src="/logo.webp"
            alt="FUYL"
            width={56}
            height={22}
            className="object-contain brightness-0 invert"
          />
        </Link>

        <div className="flex items-center gap-3">
          {/* User avatar chip */}
          {user && (
            <div className="w-8 h-8 rounded-full bg-brand-teal text-white flex items-center justify-center text-[11px] font-bold">
              {initials || '?'}
            </div>
          )}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation menu"
            className="p-1.5 rounded-lg text-brand-sage/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {/* Slide-in drawer overlay */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-brand-forest/60 backdrop-blur-sm lg:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed top-0 left-0 bottom-0 z-50 w-72 bg-brand-forest flex flex-col lg:hidden animate-slide-in-l">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <Image
                src="/logo.webp"
                alt="FUYL"
                width={64}
                height={26}
                className="object-contain brightness-0 invert"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="p-1.5 rounded-lg text-brand-sage/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* User info */}
            {user && (
              <div className="px-5 py-4 border-b border-white/10">
                <p className="text-body-sm font-semibold text-white">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-body-xs text-brand-sage/60 mt-0.5">{user.email}</p>
              </div>
            )}

            {/* Nav items */}
            <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
              {NAV_ITEMS.map(({ label, href, icon: Icon, exact }) => {
                const active = isActive(pathname, href, exact)
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl text-body-sm font-semibold transition-colors',
                      active
                        ? 'bg-white/15 text-white'
                        : 'text-brand-sage/70 hover:bg-white/8 hover:text-white',
                    )}
                  >
                    <Icon size={17} className="shrink-0" />
                    {label}
                  </Link>
                )
              })}
            </nav>

            {/* Bottom */}
            <div className="px-3 py-4 border-t border-white/10 flex flex-col gap-1">
              <a
                href="https://redfuel.in"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-body-sm font-semibold text-brand-sage/70 hover:bg-white/8 hover:text-white transition-colors"
              >
                <HelpCircle size={17} className="shrink-0" />
                Support
              </a>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-body-sm font-semibold text-brand-sage/70 hover:bg-red-500/20 hover:text-red-300 transition-colors w-full text-left"
              >
                <LogOut size={17} className="shrink-0" />
                Logout
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
