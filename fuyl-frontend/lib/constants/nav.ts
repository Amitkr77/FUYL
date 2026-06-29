export interface NavItem {
  label: string
  href: string
  external?: boolean
  children?: NavItem[]
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Shop',
    href: '/collections/all',
    children: [
      { label: 'FUYL COMPLETE+',       href: '/products/fuyl-complete' },
      { label: 'Box of 2 — COMPLETE+', href: '/products/fuyl-complete-box-of-2' },
    ],
  },
  {
    label: 'Why FUYL',
    href: '/pages/why-fuyl',
  },
  {
    label: 'Science',
    href: '/pages/science',
    children: [
      { label: 'Ingredients', href: '/pages/ingredients' },
      { label: 'Learn',       href: '/pages/learn' },
    ],
  },
  {
    label: 'Our Story',
    href: '/pages/our-story',
  },
  {
    label: 'Refer & Earn',
    href: 'https://af.uppromote.com/qu20gh-4b/register',
    external: true,
  },
]

export const FOOTER_LINKS = {
  explore: [
    { label: 'Complete+',  href: '/products/fuyl-complete' },
    { label: 'Why FUYL',   href: '/pages/why-fuyl' },
    { label: 'Ingredients',href: '/pages/ingredients' },
  ],
  discover: [
    { label: 'Our Story',  href: '/pages/our-story' },
    { label: 'Learn',      href: '/pages/learn' },
    { label: 'Refer & Earn', href: 'https://af.uppromote.com/qu20gh-4b/register', external: true },
  ],
  support: [
    { label: 'Shipping Policy',             href: '/pages/shipping-policy' },
    { label: 'Cancellation & Returns',      href: '/pages/cancellation-returns-refunds' },
    { label: 'Privacy Policy',              href: '/pages/privacy-policy' },
    { label: 'Terms of Service',            href: '/pages/terms-conditions' },
    { label: 'Contact Us',                  href: '/pages/contact' },
  ],
}
