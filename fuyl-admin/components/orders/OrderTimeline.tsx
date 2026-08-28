'use client'

import { FormEvent, useState, useTransition } from 'react'
import { CheckCircle2, MessageSquareText, Send, UserRound } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { addOrderCommentAction } from '@/app/(admin)/orders/actions'
import { formatDateTime } from '@/lib/utils'
import type { OrderStatus } from '@/lib/orderStatus'

interface Props {
  orderId: string
  customerName: string
  customerNote: string
  timeline: { status: OrderStatus; at: string; note?: string }[]
  comments: { message: string; actorEmail: string; at: string }[]
}

const statusLabel = (status: string) => status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

export function OrderTimeline({ orderId, customerName, customerNote, timeline, comments }: Props) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  const entries = [
    ...timeline.map((event) => ({ kind: 'status' as const, at: event.at, title: statusLabel(event.status), detail: event.note })),
    ...comments.map((comment) => ({ kind: 'comment' as const, at: comment.at, title: comment.actorEmail || 'Staff', detail: comment.message })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = message.trim()
    if (!value) return
    startTransition(async () => {
      setError('')
      const result = await addOrderCommentAction(orderId, value)
      if ('error' in result) { setError(result.error); return }
      setMessage('')
      router.refresh()
    })
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5">
        <div className="mb-4 flex items-center gap-2">
          <MessageSquareText className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">Timeline</h3>
        </div>
        <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} rows={3} placeholder="Leave a staff comment..." className="w-full resize-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400" />
          <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
            <p className="text-xs text-slate-400">Only administrators can see these comments.</p>
            <button disabled={pending || !message.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-[#558476] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Send className="h-3.5 w-3.5" />{pending ? 'Posting...' : 'Post'}</button>
          </div>
          {error && <p className="mt-2 text-xs text-red-600" role="alert">{error}</p>}
        </form>
      </div>

      {customerNote && (
        <div className="border-b border-amber-100 bg-amber-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div><p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Customer note from {customerName}</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{customerNote}</p></div>
          </div>
        </div>
      )}

      <div className="p-5">
        {entries.length === 0 ? <p className="text-xs text-slate-400">No activity recorded yet.</p> : (
          <div className="relative space-y-5 before:absolute before:bottom-2 before:left-2.5 before:top-2 before:w-px before:bg-slate-200">
            {entries.map((entry, index) => (
              <div key={`${entry.kind}-${entry.at}-${index}`} className="relative flex items-start gap-3">
                <div className={`z-10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${entry.kind === 'comment' ? 'bg-violet-500' : 'bg-[#558476]'}`}><CheckCircle2 className="h-3 w-3 text-white" /></div>
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><p className="break-all text-sm font-medium text-slate-900">{entry.title}</p><time className="shrink-0 text-xs text-slate-400">{formatDateTime(entry.at)}</time></div>{entry.detail && <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-500">{entry.detail}</p>}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
