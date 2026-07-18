import { AlertCircle } from 'lucide-react'
import { ReturnsTable } from '@/components/returns/ReturnsTable'
import { listReturns } from '@/lib/returns'
import { getErrorMessage } from '@/lib/api'

export default async function ReturnsPage() {
  let returns: Awaited<ReturnType<typeof listReturns>> = []
  let error = ''
  try {
    returns = await listReturns()
  } catch (err) {
    error = getErrorMessage(err, 'Could not load returns.')
  }

  const pendingCount = returns.filter((r) => r.status === 'requested').length

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Returns &amp; Refunds</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {returns.length} total{pendingCount > 0 && <span className="text-amber-600"> · {pendingCount} awaiting review</span>}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <ReturnsTable returns={returns} />
    </div>
  )
}
