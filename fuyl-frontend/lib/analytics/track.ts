/**
 * Shared analytics tracking utility.
 * Used by PageTracker (automatic page events) and any component that needs
 * to fire explicit events (checkout steps, product interactions, etc.).
 */

const SESSION_KEY = '_fuyl_sid'
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

export function getSessionId(): string {
  if (typeof sessionStorage === 'undefined') return ''
  let sid = sessionStorage.getItem(SESSION_KEY)
  if (!sid) {
    sid = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    sessionStorage.setItem(SESSION_KEY, sid)
  }
  return sid
}

export async function trackEvent(
  event: string,
  properties: Record<string, unknown> = {},
  extra: { page?: string; userId?: string } = {},
): Promise<void> {
  try {
    await fetch(`${BACKEND_URL}/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        sessionId: getSessionId(),
        page:      extra.page ?? (typeof window !== 'undefined' ? window.location.pathname : undefined),
        userId:    extra.userId,
        properties,
      }),
      keepalive: true,
    })
  } catch {
    // analytics errors must never affect the storefront
  }
}
