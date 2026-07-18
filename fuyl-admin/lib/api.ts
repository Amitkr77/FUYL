import { getSession, setSessionCookie, clearSessionCookie } from './auth'

const API_URL = process.env.API_URL || 'http://localhost:4000/api/v1'

// Shape applies to Zod validation failures (validate.middleware.ts's
// `details: [{path, message}]`) — other error branches may put a
// differently-shaped object here, so treat as unknown until checked.
export type AdminApiErrorDetail = { path: string; message: string }

export class AdminApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: AdminApiErrorDetail[]
  ) {
    super(message)
    this.name = 'AdminApiError'
  }
}

function isFieldValidationDetails(details: unknown): details is AdminApiErrorDetail[] {
  return Array.isArray(details) && details.length > 0 && details.every(
    (d) => d && typeof d === 'object' && typeof (d as AdminApiErrorDetail).message === 'string'
  )
}

// "shippingAddress.pincode" -> "Pincode", "email" -> "Email" — just the last
// path segment (the field itself), camelCase spaced out and capitalized.
function humanizeFieldPath(path: string): string {
  const last = path.split('.').filter(Boolean).pop() || path
  return last.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim()
}

// Every call site used to show only AdminApiError's generic "Validation
// failed" message and silently drop the backend's per-field `details`,
// leaving the admin with no idea what to fix. This surfaces those
// field-level reasons when present and shaped like validation output; any
// other error (wrong shape, or none) falls back to the plain message.
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AdminApiError && isFieldValidationDetails(err.details)) {
    return err.details
      .map((d) => (d.path ? `${humanizeFieldPath(d.path)}: ${d.message}` : d.message))
      .join('; ')
  }
  if (err instanceof Error && err.message) return err.message
  return fallback
}

async function rawFetch(path: string, options: { method?: string; body?: unknown; token?: string } = {}): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body:  options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  })
}

// Backend envelope: { success:true, data, meta? } / { success:false, error:{code,message,details?} }.
async function parseResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T

  const text = await res.text()
  let json: unknown = null
  try { json = text ? JSON.parse(text) : null } catch { /* non-JSON body */ }

  if (!res.ok) {
    const errorBody = json as { error?: { code?: string; message?: string; details?: AdminApiErrorDetail[] } } | null
    throw new AdminApiError(
      res.status,
      errorBody?.error?.message ?? text ?? `Request failed with status ${res.status}`,
      errorBody?.error?.code,
      errorBody?.error?.details
    )
  }

  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    return (json as { data: T }).data
  }
  return json as T
}

// One-shot silent refresh using the session's stored refresh token. Updates
// the session cookie with the new token pair on success; clears the (now
// dead) session on failure so the next request cleanly re-prompts login.
async function refreshAccessToken(session: Awaited<ReturnType<typeof getSession>>): Promise<string | null> {
  if (!session) return null
  try {
    const res = await rawFetch('/auth/refresh', { method: 'POST', body: { refreshToken: session.refreshToken } })
    const data = await parseResponse<{ accessToken: string; refreshToken: string }>(res)
    await setSessionCookie({ ...session, accessToken: data.accessToken, refreshToken: data.refreshToken })
    return data.accessToken
  } catch {
    await clearSessionCookie()
    return null
  }
}

// Authenticated request helper for admin Server Components/Actions. Reads
// the current session, attaches the bearer token, and transparently
// refreshes once on a 401 before giving up.
export async function adminApiFetch<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const session = await getSession()
  if (!session) throw new AdminApiError(401, 'Not signed in')

  let res = await rawFetch(path, { ...options, token: session.accessToken })

  if (res.status === 401) {
    const newAccessToken = await refreshAccessToken(session)
    if (!newAccessToken) throw new AdminApiError(401, 'Session expired — please sign in again')
    res = await rawFetch(path, { ...options, token: newAccessToken })
  }

  return parseResponse<T>(res)
}
