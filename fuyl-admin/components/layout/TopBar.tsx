'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  Bell, Search, Menu, X, LayoutDashboard, Package, ShoppingCart,
  Users, BarChart3, Settings, FileText, Newspaper, ChevronRight,
  Boxes, Tag, Gift, Wallet, Mail, Truck, Star, Repeat, Undo2, CreditCard,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// ── Quick-nav items shown in the command palette ──────────────────────────────

const QUICK_NAV = [
  { label: 'Dashboard',     href: '/dashboard',     Icon: LayoutDashboard, section: 'Overview'  },
  { label: 'Products',      href: '/products',      Icon: Package,         section: 'Commerce'  },
  { label: 'Orders',        href: '/orders',        Icon: ShoppingCart,    section: 'Commerce'  },
  { label: 'Customers',     href: '/customers',     Icon: Users,           section: 'Commerce'  },
  { label: 'Inventory',     href: '/inventory',     Icon: Boxes,           section: 'Commerce'  },
  { label: 'Payments',      href: '/payments',      Icon: CreditCard,      section: 'Commerce'  },
  { label: 'Shipping',      href: '/shipping',      Icon: Truck,           section: 'Commerce'  },
  { label: 'Returns',       href: '/returns',       Icon: Undo2,           section: 'Commerce'  },
  { label: 'Reviews',       href: '/reviews',       Icon: Star,            section: 'Commerce'  },
  { label: 'Subscriptions', href: '/subscriptions', Icon: Repeat,          section: 'Growth'    },
  { label: 'Discount & Cashback', href: '/discounts-cashback', Icon: Tag, section: 'Growth' },
  { label: 'Referrals',     href: '/referrals',     Icon: Gift,            section: 'Growth'    },
  { label: 'Wallet',        href: '/wallet',        Icon: Wallet,          section: 'Growth'    },
  { label: 'Newsletter',    href: '/newsletter',    Icon: Mail,            section: 'Growth'    },
  { label: 'Website Pages', href: '/content',       Icon: FileText,        section: 'Content'   },
  { label: 'Blog',          href: '/blog',          Icon: Newspaper,       section: 'Content'   },
  { label: 'Analytics',     href: '/analytics',     Icon: BarChart3,       section: 'Reports'   },
  { label: 'Settings',      href: '/settings',      Icon: Settings,        section: 'System'    },
]

// ── Page title map ────────────────────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':     'Dashboard',
  '/products':      'Products',
  '/orders':        'Orders',
  '/customers':     'Customers',
  '/inventory':     'Inventory',
  '/payments':      'Payments',
  '/shipping':      'Shipping',
  '/returns':       'Returns',
  '/reviews':       'Reviews',
  '/subscriptions': 'Subscriptions',
  '/discounts-cashback': 'Discount & Cashback',
  '/referrals':     'Referrals',
  '/wallet':        'Wallet',
  '/newsletter':    'Newsletter',
  '/content':       'Website Content',
  '/blog':          'Blog',
  '/analytics':     'Analytics',
  '/settings':      'Settings',
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface PendingOrder {
  id:          string
  orderNumber: string
  customer:    string
  amount:      number
  date:        string
}

interface TopBarProps {
  onMenuClick: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TopBar({ onMenuClick }: TopBarProps) {
  const router   = useRouter()
  const pathname = usePathname()

  // ── State ──────────────────────────────────────────────────────────────────
  const [searchOpen,    setSearchOpen]    = useState(false)
  const [notifOpen,     setNotifOpen]     = useState(false)
  const [query,         setQuery]         = useState('')
  const [activeIndex,   setActiveIndex]   = useState(0)
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([])
  const [notifTotal,    setNotifTotal]    = useState(0)
  const [notifLoading,  setNotifLoading]  = useState(false)
  const [notifFetched,  setNotifFetched]  = useState(false)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const notifPanelRef  = useRef<HTMLDivElement>(null)

  // ── Page title ─────────────────────────────────────────────────────────────
  const pageTitle = (() => {
    if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
    const match = Object.keys(PAGE_TITLES).find((k) => pathname.startsWith(k + '/'))
    return match ? PAGE_TITLES[match] : 'Admin'
  })()

  // ── Filtered results ───────────────────────────────────────────────────────
  const filtered = query.trim()
    ? QUICK_NAV.filter((n) =>
        n.label.toLowerCase().includes(query.toLowerCase()) ||
        n.section.toLowerCase().includes(query.toLowerCase())
      )
    : QUICK_NAV

  // ── Keyboard shortcut: Cmd/Ctrl+K ─────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setNotifOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── Arrow key navigation in command palette ────────────────────────────────
  useEffect(() => {
    if (!searchOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && filtered[activeIndex]) {
        navigateTo(filtered[activeIndex].href)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchOpen, activeIndex, filtered])

  // ── Focus input when palette opens ────────────────────────────────────────
  useEffect(() => {
    if (searchOpen) {
      setActiveIndex(0)
      setTimeout(() => searchInputRef.current?.focus(), 30)
    } else {
      setQuery('')
    }
  }, [searchOpen])

  // ── Reset active index when query changes ─────────────────────────────────
  useEffect(() => { setActiveIndex(0) }, [query])

  // ── Click-outside to close notifications ──────────────────────────────────
  useEffect(() => {
    if (!notifOpen) return
    const handler = (e: MouseEvent) => {
      if (notifPanelRef.current && !notifPanelRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [notifOpen])

  // ── Fetch notifications ────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (notifFetched) return
    setNotifLoading(true)
    try {
      const res  = await fetch('/api/notifications')
      const data = await res.json() as { pending: PendingOrder[]; total: number }
      setPendingOrders(data.pending)
      setNotifTotal(data.total)
      setNotifFetched(true)
    } catch {
      /* non-fatal */
    } finally {
      setNotifLoading(false)
    }
  }, [notifFetched])

  const toggleNotif = () => {
    if (!notifOpen) fetchNotifications()
    setNotifOpen((v) => !v)
  }

  // ── Navigate helper ────────────────────────────────────────────────────────
  const navigateTo = (href: string) => {
    router.push(href)
    setSearchOpen(false)
    setNotifOpen(false)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <header className="bg-white border-b border-slate-100 px-4 sm:px-6 h-14 flex items-center justify-between flex-shrink-0 z-10">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-semibold text-slate-900">{pageTitle}</h1>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1">

          {/* Search trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="group flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 hover:bg-white hover:border-slate-300 hover:text-slate-600 transition-all text-xs"
            aria-label="Search (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:block">Search…</span>
            <span className="hidden sm:flex items-center gap-0.5 ml-1">
              <kbd className="text-[10px] bg-white border border-slate-200 rounded px-1 py-0.5 font-medium text-slate-400 leading-none">
                ⌘K
              </kbd>
            </span>
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifPanelRef}>
            <button
              onClick={toggleNotif}
              className={`relative p-2 rounded-lg transition-colors ${
                notifOpen
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {notifTotal > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500" />
              )}
            </button>

            {/* Notification dropdown */}
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/60 overflow-hidden z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Notifications</p>
                    {notifTotal > 0 && (
                      <p className="text-xs text-slate-400 mt-0.5">{notifTotal} pending order{notifTotal !== 1 ? 's' : ''}</p>
                    )}
                  </div>
                  {notifTotal > 0 && (
                    <button
                      onClick={() => navigateTo('/orders?status=pending')}
                      className="text-xs font-medium text-[#558476] hover:text-[#457366] transition-colors"
                    >
                      View all
                    </button>
                  )}
                </div>

                {notifLoading ? (
                  <div className="py-10 text-center">
                    <div className="w-5 h-5 border-2 border-slate-200 border-t-[#558476] rounded-full animate-spin mx-auto" />
                  </div>
                ) : pendingOrders.length === 0 ? (
                  <div className="py-10 text-center px-6">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                      <Bell className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-600">All caught up!</p>
                    <p className="text-xs text-slate-400 mt-1">No pending orders right now</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
                    {pendingOrders.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => navigateTo(`/orders/${o.id}`)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors group"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{o.orderNumber}</p>
                          <p className="text-xs text-slate-400 truncate">{o.customer}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-semibold text-slate-900 tabular-nums">
                            {formatCurrency(o.amount)}
                          </p>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors ml-auto mt-0.5" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {pendingOrders.length > 0 && (
                  <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                    <button
                      onClick={() => navigateTo('/orders?status=pending')}
                      className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-[#558476] hover:text-[#457366] transition-colors"
                    >
                      Review all pending orders <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-[#12291F] flex items-center justify-center ml-1 shrink-0">
            <span className="text-white text-xs font-bold select-none">A</span>
          </div>
        </div>
      </header>

      {/* ── Command palette overlay ─────────────────────────────────────────── */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSearchOpen(false) }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" aria-hidden />

          {/* Palette */}
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl shadow-slate-900/20 overflow-hidden border border-slate-100">

            {/* Input row */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pages…"
                className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="shrink-0 p-0.5 rounded text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <kbd className="shrink-0 text-[10px] bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 font-medium text-slate-500 leading-none">
                Esc
              </kbd>
            </div>

            {/* Results */}
            <div
              className="py-2 max-h-[360px] overflow-y-auto"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#e2e8f0 transparent' }}
            >
              {filtered.length === 0 ? (
                <div className="py-10 text-center px-6">
                  <p className="text-sm font-medium text-slate-600">No pages found</p>
                  <p className="text-xs text-slate-400 mt-1">Try a different search term</p>
                </div>
              ) : (
                filtered.map((item, i) => {
                  const isActive = i === activeIndex
                  return (
                    <button
                      key={item.href}
                      onClick={() => navigateTo(item.href)}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isActive ? 'bg-[#558476]/8' : 'hover:bg-slate-50'
                      } ${pathname === item.href || pathname.startsWith(item.href + '/') ? 'opacity-50' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-[#558476]/10' : 'bg-slate-100'
                      }`}>
                        <item.Icon className={`w-4 h-4 ${isActive ? 'text-[#558476]' : 'text-slate-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>
                          {item.label}
                        </p>
                        <p className="text-xs text-slate-400">{item.section}</p>
                      </div>
                      {isActive && <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
                    </button>
                  )
                })
              )}
            </div>

            {/* Footer hint */}
            <div className="flex items-center gap-4 px-4 py-2.5 border-t border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <kbd className="bg-white border border-slate-200 rounded px-1 py-0.5 font-medium leading-none">↑↓</kbd>
                Navigate
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <kbd className="bg-white border border-slate-200 rounded px-1 py-0.5 font-medium leading-none">↵</kbd>
                Open
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <kbd className="bg-white border border-slate-200 rounded px-1 py-0.5 font-medium leading-none">Esc</kbd>
                Close
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
