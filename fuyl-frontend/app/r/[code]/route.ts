import { NextRequest, NextResponse } from 'next/server'

type TrackingResult = {
  success?: boolean
  data?: { destination?: string; token?: string }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

  try {
    const response = await fetch(`${apiUrl}/affiliate/track/${encodeURIComponent(code)}`, {
      headers: {
        'user-agent': request.headers.get('user-agent') ?? '',
        'x-forwarded-for': request.headers.get('x-forwarded-for') ?? '',
      },
      cache: 'no-store',
    })
    if (!response.ok) throw new Error('Tracking link could not be resolved')

    const payload = await response.json() as TrackingResult
    const destination = payload.data?.destination
    const token = payload.data?.token
    if (!destination?.startsWith('/') || destination.startsWith('//') || !token || !UUID_RE.test(token)) {
      throw new Error('Tracking response was invalid')
    }

    const redirect = NextResponse.redirect(new URL(destination, request.nextUrl.origin))
    redirect.cookies.set('aff_token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    })
    return redirect
  } catch {
    return NextResponse.redirect(new URL('/', request.nextUrl.origin))
  }
}
