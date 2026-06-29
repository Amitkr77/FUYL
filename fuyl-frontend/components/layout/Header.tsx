'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ShoppingBag, User, Search, Menu, X } from 'lucide-react'
import { NAV_ITEMS } from '@/lib/constants/nav'
import { MegaMenu } from './MegaMenu'
import { cn } from '@/lib/utils/cn'
import { useCart } from '@/lib/hooks/useCart'

export function Header() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { itemCount, openCart } = useCart()
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = (label: string) => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current)
    setActiveMenu(label)
  }

  const handleMouseLeave = () => {
    hoverTimeout.current = setTimeout(() => setActiveMenu(null), 100)
  }

  return (
    <header
      className="sticky top-0 z-40 bg-white border-b border-brand-border"
      style={{ boxShadow: '0 1px 8px rgba(18,41,31,0.06)' }}
    >
      <div className="container-brand flex items-center gap-6" style={{ height: '64px' }}>

        {/* Logo */}
        <Link href="/" className="shrink-0 mr-auto lg:mr-0">
          <Image
            src="https://fuyl.in/cdn/shop/files/Final_Logo_290526.png?v=1780044950"
            alt="FUYL"
            width={100}
            height={36}
            priority
            className="h-8 w-auto object-contain"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1 mx-auto" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <div
              key={item.label}
              className="relative"
              onMouseEnter={() => item.children && handleMouseEnter(item.label)}
              onMouseLeave={handleMouseLeave}
            >
              <Link
                href={item.href}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}
                className={cn(
                  'px-4 py-2 text-label transition-colors duration-150',
                  activeMenu === item.label
                    ? 'text-brand-teal'
                    : 'text-brand-forest hover:text-brand-teal'
                )}
              >
                {item.label}
              </Link>
              {item.children && activeMenu === item.label && (
                <MegaMenu items={item.children} onClose={() => setActiveMenu(null)} />
              )}
            </div>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-auto lg:ml-0">
          <button
            aria-label="Search"
            className="hidden lg:flex p-2.5 text-brand-olive transition-colors hover:text-brand-teal"
          >
            <Search size={18} />
          </button>
          <Link
            href="/account"
            aria-label="Account"
            className="hidden lg:flex p-2.5 text-brand-olive transition-colors hover:text-brand-teal"
          >
            <User size={18} />
          </Link>
          <button
            onClick={openCart}
            aria-label={`Cart — ${itemCount} items`}
            className="relative p-2.5 text-brand-olive transition-colors hover:text-brand-teal"
          >
            <ShoppingBag size={18} />
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-brand-rose text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center leading-none">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            className="p-2.5 text-brand-olive transition-colors hover:text-brand-teal lg:hidden"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-brand-border animate-fade-in">
          <nav className="container-brand py-4 flex flex-col gap-1" aria-label="Mobile navigation">
            {NAV_ITEMS.map((item) => (
              <div key={item.label}>
                <Link
                  href={item.href}
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noopener noreferrer' : undefined}
                  onClick={() => setMobileOpen(false)}
                  className="block py-3 text-label text-brand-forest border-b border-brand-border transition-colors hover:text-brand-teal"
                >
                  {item.label}
                </Link>
                {item.children && (
                  <div className="pl-4">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setMobileOpen(false)}
                        className="block py-2.5 text-body-sm text-brand-muted transition-colors hover:text-brand-teal"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <Link
              href="/account"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 py-3 text-label text-brand-forest transition-colors hover:text-brand-teal mt-2"
            >
              <User size={16} /> Account
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
