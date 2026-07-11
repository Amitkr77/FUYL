// Must include the backend's API_PREFIX (/api/v1 by default) — every route
// this client calls (e.g. /catalog/products/...) is mounted under it.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

type RequestOptions = {
  method?:  'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?:    unknown
  token?:   string
  guestId?: string
  cache?:   RequestCache
  tags?:    string[]
  revalidate?: number | false
  /** Internal — set on the automatic retry after a token refresh, so we never retry twice. */
  _isRetry?: boolean
}

// Access tokens are short-lived (15min). The backend also sets an httpOnly,
// same-site refresh cookie on login/register — `credentials: 'include'`
// below lets the browser send/receive it cross-port in dev (localhost:3000
// -> localhost:4000 is same-site) and cross-subdomain in prod. On a 401
// from an authenticated request, silently exchange that cookie for a new
// access token via POST /auth/refresh and retry once, so an expired token
// doesn't kick the user out mid-session.
async function tryRefreshToken(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({}),
    })
    if (!res.ok) return null
    const json = await res.json()
    return json?.data?.accessToken ?? null
  } catch {
    return null
  }
}

// Shape applies to Zod validation failures (the case forms care about). Other
// backend error branches (duplicate key, Mongoose cast/validation errors) may
// put a differently-shaped object here — treat `details` as unknown unless
// `code` indicates a validation error before assuming this array shape.
export type ApiErrorDetail = { path: string; message: string }

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: ApiErrorDetail[]
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiFetch<T>(
  path: string,
  { method = 'GET', body, token, guestId, cache, tags, revalidate, _isRetry }: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  if (guestId) {
    headers['x-guest-id'] = guestId
  }

  const nextConfig: RequestInit['next'] = {}
  if (tags)       nextConfig.tags       = tags
  if (revalidate !== undefined) nextConfig.revalidate = revalidate

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    credentials: 'include',
    body:  body ? JSON.stringify(body) : undefined,
    cache: cache ?? (revalidate !== undefined ? 'force-cache' : 'no-store'),
    next:  Object.keys(nextConfig).length ? nextConfig : undefined,
  })

  if (!res.ok) {
    // Expired access token — exchange the refresh cookie for a new one and
    // retry exactly once. Only meaningful for authenticated client-side
    // calls (token present); anonymous/public 401s just fall through.
    if (res.status === 401 && token && !_isRetry) {
      const newToken = await tryRefreshToken()
      const { useAuthStore } = await import('@/lib/store/authStore')
      if (newToken) {
        useAuthStore.setState({ token: newToken })
        return apiFetch<T>(path, { method, body, token: newToken, guestId, cache, tags, revalidate, _isRetry: true })
      }
      // Refresh failed too — the session is truly over, not just the access token.
      useAuthStore.setState({ token: null, user: null })
    }

    const raw = await res.text().catch(() => '')
    let message = raw || `Request failed with status ${res.status}`
    let code: string | undefined
    let details: ApiErrorDetail[] | undefined

    // Backend error envelope: { success:false, error:{ code, message, details? } }
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        if (parsed?.error?.message) {
          message = parsed.error.message
          code = parsed.error.code
          details = parsed.error.details
        }
      } catch {
        // Non-JSON error body (e.g. proxy/HTML error page) — fall back to raw text.
      }
    }

    throw new ApiError(res.status, message, code, details)
  }

  // 204 No Content
  if (res.status === 204) return undefined as T

  const json = await res.json()

  // Backend success envelope: { success:true, data, meta? }. Unwrap to the
  // payload the caller actually asked for. A handful of routes (health
  // checks) return { success:true, ... } with no `data` key — fall back to
  // the raw body for those rather than returning undefined.
  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    return json.data as T
  }
  return json as T
}
