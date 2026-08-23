import { adminApiFetch } from './api'

export interface AuditLogEntry {
  _id: string
  actorId?: string
  actorEmail: string
  actorName: string
  section: string
  action: string
  targetId?: string
  targetLabel?: string
  detail?: string
  createdAt: string
}

/**
 * Fetch recent audit log entries for a given section.
 * Server-side only (uses adminApiFetch which reads the session cookie).
 */
export async function getAuditLogs(opts: {
  section?: string
  limit?: number
}): Promise<AuditLogEntry[]> {
  const params = new URLSearchParams()
  if (opts.section) params.set('section', opts.section)
  if (opts.limit)   params.set('limit', String(opts.limit))
  const qs = params.toString()
  // paginate() wraps items in `data`; adminApiFetch unwraps `data` → returns the array
  return adminApiFetch<AuditLogEntry[]>(`/admin/audit-logs${qs ? `?${qs}` : ''}`)
}
