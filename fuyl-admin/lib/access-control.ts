export const STAFF_ROUTE_PERMISSIONS: ReadonlyArray<{ prefix: string; permission: string }> = [
  { prefix: '/wallet', permission: 'wallet:manage' },
  { prefix: '/discounts-cashback', permission: 'discounts:manage' },
  { prefix: '/inventory', permission: 'inventory:manage' },
  { prefix: '/shipping', permission: 'shipping:manage' },
  { prefix: '/returns', permission: 'returns:manage' },
  { prefix: '/subscriptions', permission: 'subscriptions:manage' },
  { prefix: '/referrals', permission: 'referrals:manage' },
  { prefix: '/customers', permission: 'customers:manage' },
  { prefix: '/loyalty', permission: 'loyalty:manage' },
]

export function getStaffLandingPath(permissions: string[]): string {
  return STAFF_ROUTE_PERMISSIONS.find(({ permission }) => permissions.includes(permission))?.prefix
    ?? '/access-denied'
}

export function canStaffAccessPath(pathname: string, permissions: string[]): boolean {
  if (pathname === '/access-denied') return true
  const route = STAFF_ROUTE_PERMISSIONS.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(prefix + '/')
  )
  return Boolean(route && permissions.includes(route.permission))
}
