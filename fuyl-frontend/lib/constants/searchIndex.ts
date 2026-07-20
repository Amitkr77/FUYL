// Static, curated index of the site's non-catalog pages (marketing, content,
// legal, account). Products and learn articles are searched live against the
// backend; everything else on the site lives here so a query like "shipping",
// "refund", "refer", or "ashwagandha" surfaces the right page. Keep this in
// sync when adding a new top-level page/route.

export type SearchPageGroup = 'Pages' | 'Help' | 'Account'

export interface SearchablePage {
  title: string
  description: string
  href: string
  group: SearchPageGroup
  /** Extra terms that should match this page but aren't in the title/description. */
  keywords?: string[]
}

export const SEARCHABLE_PAGES: SearchablePage[] = [
  // ─── Marketing / content ──────────────────────────────────────────────
  {
    title: 'Shop All',
    description: 'Browse the full FUYL range.',
    href: '/collections/all',
    group: 'Pages',
    keywords: ['products', 'store', 'buy', 'catalog', 'collection'],
  },
  {
    title: 'Why FUYL',
    description: 'What makes FUYL COMPLETE+ different.',
    href: '/pages/why-fuyl',
    group: 'Pages',
    keywords: ['about', 'benefits', 'difference'],
  },
  {
    title: 'The Science',
    description: 'The clinical research behind every ingredient.',
    href: '/pages/science',
    group: 'Pages',
    keywords: ['research', 'clinical', 'evidence', 'studies'],
  },
  {
    title: 'Ingredients',
    description: 'The 60+ ingredients inside FUYL COMPLETE+.',
    href: '/pages/ingredients',
    group: 'Pages',
    keywords: [
      'ashwagandha', 'ksm-66', 'probiotics', 'vitamin', 'vitamin d3', 'omega',
      'antioxidants', 'adaptogens', 'berry', 'minerals', 'prebiotic', 'fiber',
      'enzymes', 'formula', 'nutrition',
    ],
  },
  {
    title: 'Learn',
    description: 'Articles on health, nutrition, and the science of feeling better.',
    href: '/pages/learn',
    group: 'Pages',
    keywords: ['blog', 'journal', 'articles', 'guides'],
  },
  {
    title: 'Our Story',
    description: 'The people and mission behind FUYL.',
    href: '/pages/our-story',
    group: 'Pages',
    keywords: ['about', 'mission', 'brand', 'founders'],
  },
  {
    title: 'Refer & Earn',
    description: 'Invite friends and earn rewards.',
    href: '/pages/refer-and-earn',
    group: 'Pages',
    keywords: ['referral', 'invite', 'rewards', 'affiliate', 'discount'],
  },
  {
    title: 'Contact Us',
    description: 'Questions? Get in touch with the FUYL team.',
    href: '/pages/contact',
    group: 'Help',
    keywords: ['support', 'help', 'email', 'reach', 'customer service'],
  },

  // ─── Legal / help ─────────────────────────────────────────────────────
  {
    title: 'Shipping Policy',
    description: 'Delivery timelines, charges, and coverage.',
    href: '/pages/shipping-policy',
    group: 'Help',
    keywords: ['delivery', 'dispatch', 'courier', 'tracking'],
  },
  {
    title: 'Cancellation, Returns & Refunds',
    description: 'How cancellations, returns, and refunds work.',
    href: '/pages/cancellation-returns-refunds',
    group: 'Help',
    keywords: ['return', 'refund', 'cancel', 'money back', 'exchange'],
  },
  {
    title: 'Privacy Policy',
    description: 'How we collect and use your data.',
    href: '/pages/privacy-policy',
    group: 'Help',
    keywords: ['data', 'gdpr', 'cookies'],
  },
  {
    title: 'Terms & Conditions',
    description: 'The terms governing use of FUYL.',
    href: '/pages/terms-conditions',
    group: 'Help',
    keywords: ['terms of service', 'tos', 'legal'],
  },

  // ─── Account ──────────────────────────────────────────────────────────
  {
    title: 'My Account',
    description: 'Your dashboard, profile, and settings.',
    href: '/account',
    group: 'Account',
    keywords: ['login', 'sign in', 'profile', 'dashboard'],
  },
  {
    title: 'Orders',
    description: 'View and track your orders.',
    href: '/account/orders',
    group: 'Account',
    keywords: ['track', 'order history', 'purchases'],
  },
  {
    title: 'Subscriptions',
    description: 'Manage your recurring deliveries.',
    href: '/account/subscriptions',
    group: 'Account',
    keywords: ['subscribe', 'recurring', 'plan', 'manage'],
  },
  {
    title: 'Wallet',
    description: 'Your FUYL wallet balance and credits.',
    href: '/account/wallet',
    group: 'Account',
    keywords: ['credit', 'balance', 'rewards'],
  },
  {
    title: 'Addresses',
    description: 'Manage your saved delivery addresses.',
    href: '/account/addresses',
    group: 'Account',
    keywords: ['address', 'delivery address', 'shipping address'],
  },
  {
    title: 'Wishlist',
    description: 'Products you’ve saved for later.',
    href: '/account/wishlist',
    group: 'Account',
    keywords: ['saved', 'favourites', 'favorites'],
  },
]

/**
 * Substring match across title, description, and keywords. Ranked so
 * title-prefix matches surface first, then title-substring, then anything else.
 */
export function searchStaticPages(query: string, limit = 6): SearchablePage[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const scored = SEARCHABLE_PAGES.map((page) => {
    const title = page.title.toLowerCase()
    const haystack = [page.title, page.description, ...(page.keywords ?? [])]
      .join(' ')
      .toLowerCase()

    let score = -1
    if (title.startsWith(q)) score = 3
    else if (title.includes(q)) score = 2
    else if (haystack.includes(q)) score = 1

    return { page, score }
  }).filter((r) => r.score > 0)

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((r) => r.page)
}
