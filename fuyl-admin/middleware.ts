import { NextRequest, NextResponse } from 'next/server'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { canStaffAccessPath, getStaffLandingPath } from '@/lib/access-control'

const PUBLIC_PATHS = ['/login']
const STATIC_PATHS = ['/_next', '/favicon.ico']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (STATIC_PATHS.some((path) => pathname.startsWith(path)) || PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next()
  }

  // Server Actions perform their own authenticated API checks. Redirecting
  // here would break the Server Action response protocol.
  if (request.headers.get('next-action')) return NextResponse.next()

  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) return NextResponse.redirect(new URL('/login', request.url))

  const session = await verifySession(token)
  if (!session || !['admin', 'super_admin', 'staff'].includes(session.role)) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete(SESSION_COOKIE)
    return response
  }

  if (session.role === 'staff') {
    const permissions = session.permissions ?? []
    if (!canStaffAccessPath(pathname, permissions)) {
      return NextResponse.redirect(new URL(getStaffLandingPath(permissions), request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
