const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

type RequestOptions = {
  method?:  'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?:    unknown
  token?:   string
  cache?:   RequestCache
  tags?:    string[]
  revalidate?: number | false
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiFetch<T>(
  path: string,
  { method = 'GET', body, token, cache, tags, revalidate }: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const nextConfig: RequestInit['next'] = {}
  if (tags)       nextConfig.tags       = tags
  if (revalidate !== undefined) nextConfig.revalidate = revalidate

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body:  body ? JSON.stringify(body) : undefined,
    cache: cache ?? (revalidate !== undefined ? 'force-cache' : 'no-store'),
    next:  Object.keys(nextConfig).length ? nextConfig : undefined,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error')
    throw new ApiError(res.status, text)
  }

  // 204 No Content
  if (res.status === 204) return undefined as T

  return res.json()
}
