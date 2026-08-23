import { AlertCircle, Users } from 'lucide-react'
import { listStaff } from '@/lib/staff'
import { getErrorMessage } from '@/lib/api'
import { StaffTable } from '@/components/team/StaffTable'
import { ActivityFeed } from '@/components/ui/ActivityFeed'
import { getAuditLogs, type AuditLogEntry } from '@/lib/auditLog'

export default async function TeamPage() {
  let staff: Awaited<ReturnType<typeof listStaff>> = []
  let auditLogs: AuditLogEntry[] = []
  let error = ''
  try {
    ;[staff, auditLogs] = await Promise.all([
      listStaff(),
      getAuditLogs({ section: 'team', limit: 20 }).catch(() => []),
    ])
  } catch (err) {
    error = getErrorMessage(err, 'Could not load team members.')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Team / Staff</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Create staff accounts and control which modules each person can access
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <StaffTable initialStaff={staff} />
      <ActivityFeed logs={auditLogs} />
    </div>
  )
}
