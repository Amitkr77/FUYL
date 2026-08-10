import { NextRequest, NextResponse } from 'next/server'

/**
 * Affiliate tracking proxy.
 *
 * Storefront affiliate links look like  https://fuyl.in/api/r/TESTIA332
 * instead of exposing the raw API URL.  This handler simply forwards the
 * visitor to the backend tracking endpoint which records the click, sets
 * the aff_token cookie (on the API domain), and redirects to the
 * destination page.
 *
 * In dev both are on localhost, so the cookie set by :4000 is sent back
 * on every credentials:include fetch — checkout attribution works without
 * any extra plumbing.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'
  return NextResponse.redirect(`${apiUrl}/r/${code}`)
}
