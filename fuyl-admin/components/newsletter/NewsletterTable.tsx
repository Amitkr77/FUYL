'use client'

import { useMemo, useState, useTransition } from 'react'
import { Search, Download, Send, Trash2 } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import type { Subscriber, NewsletterStatus } from '@/lib/newsletter'
import { resendVerificationAction, deleteSubscriberAction } from '@/app/(admin)/newsletter/actions'

const STATUS_VARIANT: Record<NewsletterStatus, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  active: 'success',
  pending: 'warning',
  unsubscribed: 'default',
}

const STATUS_FILTERS: Array<{ value: 'all' | NewsletterStatus; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'unsubscribed', label: 'Unsubscribed' },
]

function toCsv(rows: Subscriber[]): string {
  const header = ['Email', 'Status', 'Source', 'Subscribed', 'Verified', 'Unsubscribed']
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const lines = rows.map((s) =>
    [
      s.email,
      s.status,
      s.source,
      s.subscribedAt ? new Date(s.subscribedAt).toISOString() : '',
      s.verifiedAt ? new Date(s.verifiedAt).toISOString() : '',
      s.unsubscribedAt ? new Date(s.unsubscribedAt).toISOString() : '',
    ]
      .map((v) => escape(String(v)))
      .join(','),
  )
  return [header.map(escape).join(','), ...lines].join('\r\n')
}

export function NewsletterTable({ subscribers }: { subscribers: Subscriber[] }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | NewsletterStatus>('all')
  const [pending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const filtered = useMemo(
    () =>
      subscribers.filter((s) => {
        if (statusFilter !== 'all' && s.status !== statusFilter) return false
        if (search && !s.email.toLowerCase().includes(search.toLowerCase())) return false
        return true
      }),
    [subscribers, search, statusFilter],
  )

  const handleExport = () => {
    const csv = toCsv(filtered)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleResend = (email: string, id: string) => {
    setBusyId(id)
    setMessage(null)
    startTransition(async () => {
      const res = await resendVerificationAction(email)
      setBusyId(null)
      setMessage(
        'error' in res
          ? { kind: 'err', text: res.error }
          : { kind: 'ok', text: `Confirmation email resent to ${email}.` },
      )
    })
  }

  const handleDelete = (id: string, email: string) => {
    if (!window.confirm(`Permanently delete ${email}? This removes their record and history.`)) return
    setBusyId(id)
    setMessage(null)
    startTransition(async () => {
      const res = await deleteSubscriberAction(id)
      setBusyId(null)
      setMessage(
        'error' in res
          ? { kind: 'err', text: res.error }
          : { kind: 'ok', text: `Deleted ${email}.` },
      )
    })
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | NewsletterStatus)}
          className="text-sm border border-slate-200 rounded-lg bg-slate-50 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleExport}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 sm:ml-auto"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {message && (
        <div
          className={`px-4 py-2.5 text-sm border-b ${
            message.kind === 'ok'
              ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
              : 'bg-red-50 border-red-100 text-red-600'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Email</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Source</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Subscribed</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Verified</th>
              <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-sm">
                  No subscribers found.
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4 text-sm font-medium text-slate-900">{s.email}</td>
                  <td className="px-5 py-4">
                    <Badge variant={STATUS_VARIANT[s.status]}>{s.status}</Badge>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500 hidden md:table-cell">{s.source}</td>
                  <td className="px-5 py-4 text-sm text-slate-500 hidden lg:table-cell">{formatDate(s.subscribedAt)}</td>
                  <td className="px-5 py-4 text-sm text-slate-500 hidden lg:table-cell">
                    {s.verifiedAt ? formatDate(s.verifiedAt) : '—'}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      {s.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => handleResend(s.email, s.id)}
                          disabled={pending && busyId === s.id}
                          title="Resend confirmation email"
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Resend
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(s.id, s.email)}
                        disabled={pending && busyId === s.id}
                        title="Delete subscriber"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
