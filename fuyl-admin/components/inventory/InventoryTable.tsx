'use client'

import { Fragment, useState, useTransition } from 'react'
import { Search, AlertTriangle, ChevronDown } from 'lucide-react'
import type { StockRow, AdjustmentType } from '@/lib/inventory'
import { adjustStockAction } from '@/app/(admin)/inventory/actions'

const ADJUSTMENT_TYPES: AdjustmentType[] = [
  'purchase', 'return_in', 'adjustment_in', 'adjustment_out', 'damage', 'transfer_in', 'transfer_out',
]

function AdjustRow({ row, onDone }: { row: StockRow; onDone: () => void }) {
  const [delta, setDelta] = useState('')
  const [type, setType] = useState<AdjustmentType>('adjustment_in')
  const [note, setNote] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const handleSubmit = () => {
    setError('')
    const n = Number(delta)
    if (!n || Number.isNaN(n)) {
      setError('Enter a non-zero quantity.')
      return
    }
    startTransition(async () => {
      const result = await adjustStockAction({
        productId: row.productId,
        sellerId:  row.sellerId,
        variantId: row.variantId,
        delta:     type.endsWith('_out') || type === 'damage' ? -Math.abs(n) : Math.abs(n),
        type,
        note:      note || undefined,
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      onDone()
    })
  }

  return (
    <tr className="bg-slate-50">
      <td colSpan={6} className="px-5 py-4">
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Quantity</label>
            <input
              type="number"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              placeholder="e.g. 10"
              className="w-28 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#558476]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AdjustmentType)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#558476]"
            >
              {ADJUSTMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-slate-500 mb-1">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#558476]"
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="px-4 py-2 bg-[#558476] hover:bg-[#457366] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending ? 'Saving…' : 'Apply'}
          </button>
          <button
            onClick={onDone}
            className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      </td>
    </tr>
  )
}

export function InventoryTable({ stock }: { stock: StockRow[] }) {
  const [search, setSearch] = useState('')
  const [openRow, setOpenRow] = useState<string | null>(null)

  const filtered = stock.filter((s) =>
    !search || s.productName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="p-4 border-b border-slate-100">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Product</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">On Hand</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Reserved</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Available</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Warehouse</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-sm">No stock records found.</td>
              </tr>
            ) : (
              filtered.map((row) => {
                const low = row.reorderThreshold > 0 && row.available <= row.reorderThreshold
                const isOpen = openRow === row.id
                return (
                  <Fragment key={row.id}>
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {low && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                          <span className="text-sm font-medium text-slate-900">{row.productName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700 font-medium">{row.onHand}</td>
                      <td className="px-5 py-4 text-sm text-slate-500">{row.reserved}</td>
                      <td className={`px-5 py-4 text-sm font-semibold ${low ? 'text-amber-600' : 'text-slate-900'}`}>{row.available}</td>
                      <td className="px-5 py-4 text-sm text-slate-500 hidden md:table-cell">{row.warehouseId}</td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => setOpenRow(isOpen ? null : row.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          Adjust
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                      </td>
                    </tr>
                    {isOpen && <AdjustRow row={row} onDone={() => setOpenRow(null)} />}
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
