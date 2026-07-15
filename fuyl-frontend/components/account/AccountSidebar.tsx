'use client'

import Link from 'next/link'
import {
  User as UserIcon,
  Package,
  RotateCcw,
  Wallet as WalletIcon,
  MapPin,
  Heart,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { User } from '@/types/user'

const NAV_ITEMS = [
  { label: 'Profile', href: '/account', icon: UserIcon, exact: true },
  { label: 'Orders', href: '/account/orders', icon: Package, exact: false },
  { label: 'Subscriptions', href: '/account/subscriptions', icon: RotateCcw, exact: false },
  { label: 'Wallet', href: '/account/wallet', icon: WalletIcon, exact: false },
  { label: 'Addresses', href: '/account/addresses', icon: MapPin, exact: false },
  { label: 'Wishlist', href: '/account/wishlist', icon: Heart, exact: false },
] as const

interface AccountSidebarProps {
  user: User
  pathname: string
  onSignOut: () => void
}

function isActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname.startsWith(href)
}

export function AccountSidebar({ user, pathname, onSignOut }: AccountSidebarProps) {
  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()

  return (
    <>
      {/* Desktop sidebar — left column, own vertical nav */}
      <aside className="hidden lg:block w-60 shrink-0 lg:sticky lg:top-24">
        <div className="flex items-center gap-3 bg-brand-cream rounded-2xl p-4 mb-4">
          <div className="shrink-0 w-11 h-11 rounded-full bg-brand-forest text-white flex items-center justify-center text-body-sm font-display font-bold">
            {initials || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-body-sm font-semibold text-brand-forest truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-body-xs text-brand-muted truncate">{user.email}</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ label, href, icon: Icon, exact }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-body-sm font-semibold whitespace-nowrap transition-colors',
                isActive(pathname, href, exact)
                  ? 'bg-brand-forest text-white'
                  : 'text-brand-forest hover:bg-brand-sage/60',
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
          <button
            onClick={onSignOut}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-body-sm font-semibold text-brand-muted hover:text-brand-forest hover:bg-brand-sage/60 transition-colors mt-3 border-t border-brand-border pt-4"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </nav>
      </aside>

      {/* Mobile profile bar — sign out lives here since the bottom bar is tabs only */}
      <div className="flex lg:hidden items-center gap-3 bg-brand-cream rounded-2xl p-4 w-full">
        <div className="shrink-0 w-11 h-11 rounded-full bg-brand-forest text-white flex items-center justify-center text-body-sm font-display font-bold">
          {initials || '?'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-body-sm font-semibold text-brand-forest truncate">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-body-xs text-brand-muted truncate">{user.email}</p>
        </div>
        <button
          onClick={onSignOut}
          aria-label="Sign out"
          className="shrink-0 p-2 rounded-full text-brand-muted hover:text-brand-forest hover:bg-white transition-colors"
        >
          <LogOut size={18} />
        </button>
      </div>

      {/* Mobile bottom tab bar — icon-only for a cleaner look, label kept for screen readers */}
      <nav
        aria-label="Account sections"
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 flex items-center justify-around bg-white border-t border-brand-border py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
      >
        {NAV_ITEMS.map(({ label, href, icon: Icon, exact }) => {
          const active = isActive(pathname, href, exact)
          return (
            <Link key={href} href={href} aria-label={label} className="flex flex-1 items-center justify-center py-1.5">
              <span
                className={cn(
                  'flex items-center justify-center w-11 h-11 rounded-full transition-colors',
                  active ? 'bg-brand-forest text-white' : 'text-brand-muted',
                )}
              >
                <Icon size={20} />
              </span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
