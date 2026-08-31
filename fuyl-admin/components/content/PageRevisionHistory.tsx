'use client'

import { useState, useTransition } from 'react'
import { AlertCircle, CheckCircle2, History, RotateCcw } from 'lucide-react'
import type { CMSPageRevision } from '@/lib/content'
import { restorePageRevisionAction } from '@/app/(admin)/content/actions'

export function PageRevisionHistory({ pageId, revisions, hasUnsavedChanges }: { pageId: string; revisions: CMSPageRevision[]; hasUnsavedChanges: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const restore = (revision: CMSPageRevision) => {
    const warning = hasUnsavedChanges ? 'Your unsaved changes will be discarded. ' : ''
    if (!window.confirm(`${warning}Restore the version saved on ${new Date(revision.savedAt).toLocaleString()}? The current version will remain in history.`)) return
    startTransition(async () => {
      setError('')
      const result = await restorePageRevisionAction(pageId, revision.revisionId)
      if (result.error) { setError(result.error); return }
      window.location.reload()
    })
  }

  return <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
    <button type="button" onClick={() => setExpanded((value) => !value)} className="flex w-full items-center justify-between p-5 text-left">
      <span><span className="flex items-center gap-2 text-sm font-semibold text-slate-900"><History className="h-4 w-4" />Version history</span><span className="mt-1 block text-xs text-slate-500">{revisions.length ? `${revisions.length} recoverable version${revisions.length === 1 ? '' : 's'}` : 'History starts after the next save'}</span></span>
      <span className="text-xs font-medium text-[#558476]">{expanded ? 'Hide' : 'View'}</span>
    </button>
    {expanded && <div className="border-t border-slate-100 p-4">
      {error && <p className="mb-3 flex gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-600"><AlertCircle className="h-4 w-4 shrink-0" />{error}</p>}
      {!revisions.length ? <p className="py-3 text-center text-xs text-slate-400">Previous versions will appear here whenever this page is saved.</p> :
        <ol className="max-h-72 space-y-2 overflow-y-auto">{revisions.map((revision, index) => <li key={revision.revisionId} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3">
          <div className="min-w-0"><p className="truncate text-xs font-medium text-slate-700">{revision.title}</p><p className="mt-0.5 text-[11px] text-slate-400">{new Date(revision.savedAt).toLocaleString()} · {revision.status}{index === 0 ? ' · Most recent' : ''}</p></div>
          <button type="button" disabled={pending} onClick={() => restore(revision)} className="flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 hover:text-[#558476] disabled:opacity-50"><RotateCcw className="h-3.5 w-3.5" />Restore</button>
        </li>)}</ol>}
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400"><CheckCircle2 className="h-3.5 w-3.5" />The latest 20 versions are retained.</p>
    </div>}
  </div>
}
