'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, ChevronRight, Home } from 'lucide-react'

const LABELS: Record<string, string> = {
  affiliates: 'Affiliates',
  analytics: 'Analytics',
  blog: 'Blog',
  cashback: 'Cashback',
  commissions: 'Commissions',
  content: 'Content',
  customers: 'Customers',
  'discounts-cashback': 'Discounts & Cashback',
  discounts: 'Discounts',
  edit: 'Edit',
  faqs: 'FAQs',
  hero: 'Hero Section',
  ingredients: 'Ingredients',
  inventory: 'Inventory',
  members: 'Affiliates',
  new: 'Create new',
  newsletter: 'Newsletter',
  prebookings: 'Pre-booking Leads',
  orders: 'Orders',
  pages: 'Storefront Pages',
  payouts: 'Payouts',
  payments: 'Payments',
  products: 'Products',
  programs: 'Programs',
  referrals: 'Referrals',
  returns: 'Returns',
  reviews: 'Reviews',
  settings: 'Settings',
  shipping: 'Shipping',
  subscriptions: 'Subscriptions',
  testimonials: 'Testimonials',
  wallet: 'Wallet',
}

const CONTENT_TABS: Record<string, string> = {
  pages: 'pages',
  ingredients: 'ingredients',
  testimonials: 'testimonials',
  faqs: 'faqs',
}

function title(segment: string, index: number, segments: string[]) {
  if (LABELS[segment]) return LABELS[segment]
  if (segment.length > 16 || /^[a-f\d]{16,}$/i.test(segment)) {
    return segments[index - 1] === 'programs' ? 'Program details' : 'Details'
  }
  return decodeURIComponent(segment).replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function hrefFor(segments: string[], index: number) {
  const path = `/${segments.slice(0, index + 1).join('/')}`
  if (segments[0] === 'content' && index === 1 && CONTENT_TABS[segments[1]]) {
    return `/content?tab=${CONTENT_TABS[segments[1]]}`
  }
  return path
}

export default function AdminBreadcrumbs() {
  const pathname = usePathname()
  const router = useRouter()
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length < 2) return null

  return (
    <nav aria-label="Breadcrumb" className="mb-5 flex min-w-0 items-center gap-3">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-900"
        aria-label="Go back"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Back</span>
      </button>

      <ol className="flex min-w-0 items-center gap-1.5 overflow-hidden text-sm text-slate-500">
        <li className="shrink-0">
          <Link href="/dashboard" className="transition-colors hover:text-[#315f52]" aria-label="Dashboard">
            <Home className="h-4 w-4" />
          </Link>
        </li>
        {segments.map((segment, index) => {
          const current = index === segments.length - 1
          return (
            <li key={`${segment}-${index}`} className="flex min-w-0 items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
              {current ? (
                <span className="truncate font-medium text-slate-800" aria-current="page">
                  {title(segment, index, segments)}
                </span>
              ) : (
                <Link href={hrefFor(segments, index)} className="truncate transition-colors hover:text-[#315f52]">
                  {title(segment, index, segments)}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
