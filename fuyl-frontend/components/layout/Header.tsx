"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, User, Search, Menu, X, ChevronDown } from "lucide-react";
import { NAV_ITEMS, type NavItem } from "@/lib/constants/nav";
import { MegaMenu } from "./MegaMenu";
import { SearchModal } from "@/components/search/SearchModal";
import { cn } from "@/lib/utils/cn";
import { useCart } from "@/lib/hooks/useCart";

function MobileNavItem({
  item,
  onClose,
}: {
  item: NavItem;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(false);
  const hasChildren = !!item.children?.length;

  return (
    <div className="border-b border-brand-border/60 last:border-0">
      {hasChildren ? (
        <div className="flex w-full items-center justify-between">
          <Link
            href={item.href}
            target={item.external ? "_blank" : undefined}
            rel={item.external ? "noopener noreferrer" : undefined}
            onClick={onClose}
            className="flex-1 py-3.5 text-label text-brand-forest transition-colors hover:text-brand-teal"
          >
            {item.label}
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? `Collapse ${item.label} menu` : `Expand ${item.label} menu`}
            aria-expanded={open}
            className="shrink-0 p-3.5 -mr-3.5 text-brand-muted transition-colors hover:text-brand-teal"
          >
            <ChevronDown
              size={15}
              className={cn(
                "transition-transform duration-200",
                open && "rotate-180 text-brand-teal",
              )}
            />
          </button>
        </div>
      ) : (
        <Link
          href={item.href}
          target={item.external ? "_blank" : undefined}
          rel={item.external ? "noopener noreferrer" : undefined}
          onClick={onClose}
          className="flex w-full items-center justify-between py-3.5 text-label text-brand-forest transition-colors hover:text-brand-teal"
        >
          {item.label}
        </Link>
      )}

      {/* Animated submenu */}
      {hasChildren && (
        <div
          className={cn(
            "grid transition-all duration-250 ease-in-out",
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden">
            <div className="pb-3 pt-0.5">
              {item.children!.map((child) => (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={onClose}
                  className="flex items-center gap-3 py-2.5 pl-4 text-body-sm text-brand-muted transition-colors hover:text-brand-teal"
                >
                  <span className="h-1 w-1 rounded-full bg-brand-teal/50 shrink-0" />
                  {child.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface HeaderProps {
  // Top products from the shop page, passed down from the (server) root
  // layout — replaces the Shop submenu's static children when non-empty, so
  // it always mirrors whatever currently sits at the top of /collections/all
  // instead of two hand-picked links going stale as the catalog changes.
  shopItems?: NavItem[];
}

export function Header({ shopItems }: HeaderProps = {}) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { itemCount, openCart } = useCart();
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navItems = shopItems?.length
    ? NAV_ITEMS.map((item) =>
        item.label === "Shop" ? { ...item, children: shopItems } : item,
      )
    : NAV_ITEMS;

  const handleMouseEnter = (label: string) => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setActiveMenu(label);
  };

  const handleMouseLeave = () => {
    hoverTimeout.current = setTimeout(() => setActiveMenu(null), 100);
  };

  return (
    <>
      <header
        className="sticky top-0 z-40 bg-white border-b border-brand-border"
        style={{ boxShadow: "0 1px 8px rgba(18,41,31,0.06)" }}
      >
        <div
          className="container-brand flex items-center gap-6"
          style={{ height: "64px" }}
        >
          {/* Logo */}
          <Link href="/" className="shrink-0 mr-auto lg:mr-0">
            <Image
              src="/logo.webp"
              alt="FUYL"
              width={100}
              height={36}
              priority
              className="h-14 w-auto object-contain"
            />
          </Link>

          {/* Desktop nav */}
          <nav
            className="hidden lg:flex items-center gap-1 mx-auto"
            aria-label="Main navigation"
          >
            {navItems.map((item) => (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() =>
                  item.children && handleMouseEnter(item.label)
                }
                onMouseLeave={handleMouseLeave}
              >
                <Link
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  className={cn(
                    "px-4 py-2 text-label transition-colors duration-150",
                    activeMenu === item.label
                      ? "text-brand-teal"
                      : "text-brand-forest hover:text-brand-teal",
                  )}
                >
                  {item.label}
                </Link>
                {item.children && activeMenu === item.label && (
                  <MegaMenu
                    items={item.children}
                    onClose={() => setActiveMenu(null)}
                  />
                )}
              </div>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1 ml-auto lg:ml-0">
            <button
              onClick={() => setSearchOpen(true)}
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
                <span className="absolute -top-0.5 -right-0.5 bg-brand-forest text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center leading-none">
                  {itemCount > 9 ? "9+" : itemCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
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
            <nav
              className="container-brand py-2 flex flex-col"
              aria-label="Mobile navigation"
            >
              {navItems.map((item) => (
                <MobileNavItem
                  key={item.label}
                  item={item}
                  onClose={() => setMobileOpen(false)}
                />
              ))}
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(true);
                  setMobileOpen(false);
                }}
                className="flex items-center gap-2 py-3.5 text-label text-brand-forest transition-colors hover:text-brand-teal border-b border-brand-border/60"
              >
                <Search size={15} /> Search
              </button>
              <Link
                href="/account"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 py-3.5 text-label text-brand-forest transition-colors hover:text-brand-teal mt-1"
              >
                <User size={15} /> Account
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Global search modal — live results across products, articles & pages */}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
