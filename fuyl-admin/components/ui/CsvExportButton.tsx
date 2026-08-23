'use client'

import { useRef, useState } from 'react'
import { Download, Calendar, X, ChevronDown } from 'lucide-react'

type CsvValue = string | number | boolean | null | undefined

export function CsvExportButton({
  filename,
  columns,
  rows,
  dateKey,
  label = 'Export CSV',
}: {
  filename: string
  columns: Array<{ key: string; label: string }>
  rows: object[]
  /** If provided, shows a date-range filter using this row key (must be an ISO date string) */
  dateKey?: string
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo]     = useState('')
  const popoverRef = useRef<HTMLDivElement>(null)

  const filteredRows = (): object[] => {
    if (!dateKey || (!from && !to)) return rows
    const fromTs = from ? new Date(from).getTime() : -Infinity
    const toTs   = to   ? new Date(to + 'T23:59:59').getTime() : Infinity
    return rows.filter((row) => {
      const val = (row as Record<string, CsvValue>)[dateKey]
      if (!val) return true  // rows without a date are always included
      const ts = new Date(String(val)).getTime()
      if (isNaN(ts)) return true
      return ts >= fromTs && ts <= toTs
    })
  }

  const exportCsv = (exportRows: object[]) => {
    const escape = (value: CsvValue) => `"${String(value ?? '').replaceAll('"', '""')}"`
    const csvRows = [
      columns.map((column) => column.label),
      ...exportRows.map((row) => columns.map((column) => (row as Record<string, CsvValue>)[column.key])),
    ]
    const suffix = from || to
      ? `_${from || 'start'}_to_${to || 'end'}`
      : `_${new Date().toISOString().slice(0, 10)}`
    const csv = `\uFEFF${csvRows.map((row) => row.map(escape).join(',')).join('\r\n')}`
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}${suffix}.csv`
    link.click()
    URL.revokeObjectURL(url)
    setOpen(false)
  }

  // Simple export (no date filter available)
  if (!dateKey) {
    return (
      <button
        type="button"
        onClick={() => exportCsv(rows)}
        disabled={!rows.length}
        className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-700 text-sm font-medium rounded-lg shadow-sm hover:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
      >
        <Download className="w-4 h-4" />
        {label}
      </button>
    )
  }

  const preview = filteredRows()

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={!rows.length}
        className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-700 text-sm font-medium rounded-lg shadow-sm hover:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
      >
        <Download className="w-4 h-4" />
        {label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <Calendar className="w-4 h-4 text-slate-400" />
              Date Range Filter
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#558476]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                min={from}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#558476]"
              />
            </div>
          </div>

          <p className="text-xs text-slate-400">
            {from || to
              ? `${preview.length} of ${rows.length} rows match`
              : `All ${rows.length} rows (no filter)`}
          </p>

          <div className="flex gap-2">
            {(from || to) && (
              <button
                onClick={() => { setFrom(''); setTo('') }}
                className="flex-1 px-3 py-2 text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => exportCsv(preview)}
              disabled={preview.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#558476] hover:bg-[#457366] text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Export {preview.length} rows
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
