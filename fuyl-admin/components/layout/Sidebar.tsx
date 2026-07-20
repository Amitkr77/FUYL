'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  FileText,
  Newspaper,
  BarChart3,
  Settings,
  Leaf,
  LogOut,
  X,
  Boxes,
  Wallet,
  Gift,
  Tag,
  Repeat,
  Undo2,
  Truck,
  Mail,
} from 'lucide-react'
import { logout } from '@/app/(admin)/actions'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Commerce',
    items: [
      { label: 'Products', href: '/products', icon: Package },
      { label: 'Orders', href: '/orders', icon: ShoppingCart },
      { label: 'Customers', href: '/customers', icon: Users },
      { label: 'Inventory', href: '/inventory', icon: Boxes },
      { label: 'Shipping', href: '/shipping', icon: Truck },
      { label: 'Returns', href: '/returns', icon: Undo2 },
    ],
  },
  {
    title: 'Growth',
    items: [
      { label: 'Subscriptions', href: '/subscriptions', icon: Repeat },
      { label: 'Promotions', href: '/promotions', icon: Tag },
      { label: 'Referrals', href: '/referrals', icon: Gift },
      { label: 'Wallet', href: '/wallet', icon: Wallet },
      { label: 'Newsletter', href: '/newsletter', icon: Mail },
    ],
  },
  {
    title: 'Content',
    items: [
      { label: 'Website Pages', href: '/content', icon: FileText },
      { label: 'Blog', href: '/blog', icon: Newspaper },
    ],
  },
  {
    title: 'Reports',
    items: [
      { label: 'Analytics', href: '/analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Settings', href: '/settings', icon: Settings },
    ],
  },
]

interface SidebarProps {
  onClose?: () => void
}

export default function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <div className="flex flex-col h-full bg-[#12291F] w-60">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#558476] rounded-lg flex items-center justify-center flex-shrink-0">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-lg font-bold text-white tracking-widest leading-none">FUYL</div>
            <div className="text-[10px] font-semibold text-[#558476] tracking-[0.25em] uppercase mt-0.5">Admin</div>
          </div>
        </div>
        {/* Mobile close */}
        <button
          onClick={onClose}
          className="lg:hidden text-white/50 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-hide space-y-6">
        {navSections.map((section) => (
          <div key={section.title}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold text-white/30 uppercase tracking-[0.2em]">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href)
                const Icon = item.icon
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative ${
                        active
                          ? 'bg-white/10 text-white border-l-2 border-[#558476] pl-[10px]'
                          : 'text-white/60 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-[#558476]' : ''}`} />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom user info */}
      <div className="border-t border-white/10 p-4 space-y-3">
        <div className="flex items-center gap-3 px-1">
          <div className="w-8 h-8 rounded-full bg-[#558476] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-medium truncate">admin@fuyl.in</p>
            <p className="text-white/40 text-[11px]">Administrator</p>
          </div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white transition-all duration-150"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}
