'use client'

import { useState, useTransition } from 'react'
import { ClipboardPen, CheckCircle2 } from 'lucide-react'
import { updateOrderNotesAction } from '@/app/(admin)/orders/actions'

export function AdminOrderNote({ orderId, initialValue }: { orderId: string; initialValue: string }) {
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  const save = () => startTransition(async () => {
    setError('')
    const result = await updateOrderNotesAction(orderId, value)
    if ('error' in result) { setError(result.error); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  })

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <ClipboardPen className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-900">Internal Order Note</h3>
      </div>
      <textarea value={value} onChange={(e) => setValue(e.target.value)} maxLength={5000} rows={4}
        placeholder="Add fulfilment instructions or other internal context…"
        className="w-full resize-y px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#558476]" />
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-400">Visible only to authorised administrators.</p>
        <button type="button" onClick={save} disabled={pending || value === initialValue}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#558476] text-white text-sm font-medium disabled:opacity-50">
          {saved && <CheckCircle2 className="w-4 h-4" />}{pending ? 'Saving…' : saved ? 'Saved' : 'Save Note'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}
