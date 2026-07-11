import { NextRequest, NextResponse } from 'next/server'
import { verifySession, SESSION_COOKIE } from '@/lib/session'

const PUBLIC_PATHS = ['/login']
const STATIC_PATHS = ['/_next', '/favicon.ico']

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
  if (!session || !['admin', 'super_admin'].includes(session.role)) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete(SESSION_COOKIE)
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
