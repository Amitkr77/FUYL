'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react'
import { migrateLegacyDefaultAction } from '@/app/(admin)/inventory/actions'

interface Props {
  defaultLocationName: string | null
  defaultLocationCode: string | null
}

export function LegacyDefaultBanner({ defaultLocationName, defaultLocationCode }: Props) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{ migratedCount: number; warehouseCode: string } | null>(null)
  const [error, setError] = useState('')

  const handleMigrate = async () => {
    if (!defaultLocationCode) return
    setState('loading')
    setError('')
    const res = await migrateLegacyDefaultAction()
    if ('error' in res) {
      setError(res.error)
      setState('error')
      return
    }
    setResult(res)
    setState('done')
    router.refresh()
  }

  if (state === 'done' && result) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-emerald-800">Migration complete</p>
          <p className="text-emerald-700 mt-0.5">
            {result.migratedCount} stock record{result.migratedCount !== 1 ? 's' : ''} moved to{' '}
            <span className="font-mono font-medium">{result.warehouseCode}</span>.
            &quot;Legacy Default&quot; will no longer appear in the dropdown.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900">Legacy stock detected</p>
        <p className="text-sm text-amber-700 mt-0.5">
          Some stock records still use the old <span className="font-mono text-xs bg-amber-100 px-1 py-0.5 rounded">default</span> warehouse ID
          from before the warehouse location system was set up. This is why &quot;Legacy Default&quot; appears in the
          inventory dropdown.
        </p>

        {!defaultLocationCode ? (
          <p className="text-sm text-amber-700 mt-2">
            To fix this, first mark one of your warehouse locations as the <strong>default</strong> using the
            &quot;Set as default&quot; button below, then come back to migrate.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <div className="flex items-center gap-1.5 text-sm text-amber-700">
              <span className="font-mono text-xs bg-amber-100 px-1 py-0.5 rounded">default</span>
              <ArrowRight className="w-3.5 h-3.5" />
              <span className="font-semibold text-amber-900">{defaultLocationName}</span>
              <span className="font-mono text-xs bg-amber-100 px-1 py-0.5 rounded">{defaultLocationCode}</span>
            </div>
            <button
              onClick={handleMigrate}
              disabled={state === 'loading'}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors disabled:opacity-60"
            >
              {state === 'loading' ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Migrating…</>
              ) : (
                'Migrate now'
              )}
            </button>
          </div>
        )}

        {state === 'error' && (
          <p className="text-xs text-red-600 mt-2">{error}</p>
        )}
      </div>
    </div>
  )
}
