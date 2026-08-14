'use client'

import { Download } from 'lucide-react'

type CsvValue = string | number | boolean | null | undefined

export function CsvExportButton({
  filename,
  columns,
  rows,
  label = 'Export CSV',
}: {
  filename: string
  columns: Array<{ key: string; label: string }>
  rows: object[]
  label?: string
}) {
  const exportCsv = () => {
    const escape = (value: CsvValue) => `"${String(value ?? '').replaceAll('"', '""')}"`
    const csvRows = [
      columns.map((column) => column.label),
      ...rows.map((row) => columns.map((column) => (row as Record<string, CsvValue>)[column.key])),
    ]
    // BOM helps Excel recognize UTF-8 text and Indian currency/content.
    const csv = `\uFEFF${csvRows.map((row) => row.map(escape).join(',')).join('\r\n')}`
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button type="button" onClick={exportCsv} disabled={!rows.length} className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-700 text-sm font-medium rounded-lg shadow-sm hover:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed">
      <Download className="w-4 h-4" />
      {label}
    </button>
  )
}
