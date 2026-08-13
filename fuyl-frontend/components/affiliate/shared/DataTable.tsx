import { cn } from '@/lib/utils/cn'
import { Skeleton } from '@/components/ui/Skeleton'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ColumnDef<T> {
  key:        string
  header:     string
  /** Render cell content. Return a ReactNode. */
  cell:       (row: T) => React.ReactNode
  align?:     'left' | 'right' | 'center'
  className?: string   // extra classes on both th and td
}

interface DataTableProps<T> {
  columns:      ColumnDef<T>[]
  rows:         T[]
  rowKey:       (row: T) => string
  loading?:     boolean
  emptyMessage?: string
  className?:   string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  emptyMessage = 'No records found.',
  className,
}: DataTableProps<T>) {
  const alignClass = (align?: 'left' | 'right' | 'center') =>
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'

  return (
    <div className={cn('overflow-x-auto bg-white border border-brand-border rounded-xl', className)}>
      <table className="w-full text-body-xs">
        <thead>
          <tr className="border-b border-brand-border/60 bg-brand-cream/60">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-label uppercase tracking-wide text-brand-muted font-semibold',
                  alignClass(col.align),
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-brand-border/40">
          {loading ? (
            // Skeleton rows
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <Skeleton className="h-3 w-full max-w-[120px]" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-brand-muted text-body-sm"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="hover:bg-brand-cream/40 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-brand-forest',
                      alignClass(col.align),
                      col.className,
                    )}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
