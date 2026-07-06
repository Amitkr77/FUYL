'use client'

import { usePathname } from 'next/navigation'
import { Bell, Search, Menu } from 'lucide-react'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/products': 'Products',
  '/orders': 'Orders',
  '/customers': 'Customers',
  '/content': 'Website Content',
  '/blog': 'Blog',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
}

interface TopBarProps {
  onMenuClick: () => void
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const pathname = usePathname()

  const getPageTitle = () => {
    // Exact match first
    if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
    // Prefix match
    const match = Object.keys(PAGE_TITLES).find((key) => pathname.startsWith(key + '/'))
    return match ? PAGE_TITLES[match] : 'Admin'
  }

  return (
    <header className="bg-white border-b border-slate-200 px-4 sm:px-6 h-14 flex items-center justify-between flex-shrink-0 z-10">
      {/* Left */}
      <div className="flex items-center gap-3">
        {/* Hamburger - mobile only */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold text-slate-900">{getPageTitle()}</h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <button className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
          <Search className="w-4 h-4" />
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#B76E79]" />
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-[#12291F] flex items-center justify-center ml-1">
          <span className="text-white text-xs font-bold">A</span>
        </div>
      </div>
    </header>
  )
}
