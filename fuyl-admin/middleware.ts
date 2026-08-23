import { NextRequest, NextResponse } from 'next/server'
import { verifySession, SESSION_COOKIE } from '@/lib/session'

const PUBLIC_PATHS = ['/login']
const STATIC_PATHS = ['/_next', '/favicon.ico']

// Routes that require a specific permission for staff members.
// Admin and super_admin bypass all of these checks.
const ROUTE_PERMISSIONS: { prefix: string; permission: string }[] = [
  { prefix: '/wallet',             permission: 'wallet:manage' },
  { prefix: '/discounts-cashback', permission: 'discounts:manage' },
  { prefix: '/inventory',          permission: 'inventory:manage' },
  { prefix: '/shipping',           permission: 'shipping:manage' },
  { prefix: '/returns',            permission: 'returns:manage' },
  { prefix: '/subscriptions',      permission: 'subscriptions:manage' },
  { prefix: '/referrals',          permission: 'referrals:manage' },
  { prefix: '/customers',          permission: 'customers:manage' },
  { prefix: '/loyalty',            permission: 'loyalty:manage' },
]

// Routes staff can always reach even with zero permissions.
const STAFF_PUBLIC_ROUTES = ['/dashboard']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow static files and public paths
  if (
    STATIC_PATHS.some((p) => pathname.startsWith(p)) ||
    PUBLIC_PATHS.includes(pathname)
  ) {
    return NextResponse.next()
  }

  // Server Actions (e.g. the sidebar's logout form, or any admin page's
  // save/update action) POST to the current page URL, not a separate
  // route — so they also match this middleware. A hard redirect response
  // here breaks the Server Action protocol: the client sent the request
  // expecting an action result and gets a raw redirect instead, which
  // Next.js surfaces as "An unexpected response was received from the
  // server" instead of a normal in-app error. BUG FIXED (found live): this
  // happened on every Server Action call once the session cookie was
  // missing/expired, including logout itself. Actions already handle a
  // missing/invalid session correctly on their own (getSession() returns
  // null, adminApiFetch throws a catchable AdminApiError, logout() clears
  // the cookie and redirect()s using the real action protocol) — so for
  // action requests we let them through instead of redirecting here.
  if (request.headers.get('next-action')) {
    return NextResponse.next()
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const session = await verifySession(token)
  if (!session || !['admin', 'super_admin', 'staff'].includes(session.role)) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete(SESSION_COOKIE)
    return response
  }

  // Staff members may only access routes their permissions grant them.
  // Admin and super_admin have implicit full access.
  if (session.role === 'staff') {
    if (!STAFF_PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))) {
      const permissions: string[] = session.permissions ?? []
      const routePermission = ROUTE_PERMISSIONS.find(
        (r) => pathname === r.prefix || pathname.startsWith(r.prefix + '/')
      )
      if (!routePermission || !permissions.includes(routePermission.permission)) {
        // Authenticated but not authorised — send to dashboard, not login.
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
