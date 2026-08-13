'use client'

import { Fragment, useState, useTransition } from 'react'
import {
  Search, AlertTriangle, ChevronDown, ChevronRight,
  PackageOpen, X, Package,
} from 'lucide-react'
import type { StockRow, AdjustmentType } from '@/lib/inventory'
import { adjustStockAction } from '@/app/(admin)/inventory/actions'

// ─── Adjustment type helpers ────────────────────────────────────────────────

const ADJUSTMENT_TYPES: AdjustmentType[] = [
  'purchase', 'return_in', 'adjustment_in', 'adjustment_out',
  'damage', 'transfer_in', 'transfer_out',
]

const ADJUSTMENT_LABELS: Record<AdjustmentType, string> = {
  purchase:       'Purchase / Received',
  return_in:      'Customer Return',
  adjustment_in:  'Manual Add',
  adjustment_out: 'Manual Remove',
  damage:         'Damaged / Write-off',
  transfer_in:    'Transfer In',
  transfer_out:   'Transfer Out',
}

// These types reduce stock — the delta will be negated before sending
const OUTBOUND: Set<AdjustmentType> = new Set(['adjustment_out', 'damage', 'transfer_out'])

// ─── Types ──────────────────────────────────────────────────────────────────

type StockLevel = 'all' | 'low' | 'out'

interface ProductGroup {
  productId: string
  productName: string
  rows: StockRow[]
  totalOnHand: number
  totalReserved: number
  totalAvailable: number
  hasLow: boolean
  hasOut: boolean
}

// ─── Group stock rows by product ────────────────────────────────────────────

function groupByProduct(rows: StockRow[]): ProductGroup[] {
  const map = new Map<string, ProductGroup>()
  for (const row of rows) {
    const existing = map.get(row.productId)
    if (existing) {
      existing.rows.push(row)
      existing.totalOnHand    += row.onHand
      existing.totalReserved  += row.reserved
      existing.totalAvailable += row.available
      if (row.available === 0) existing.hasOut = true
      if (row.reorderThreshold > 0 && row.available > 0 && row.available <= row.reorderThreshold) existing.hasLow = true
    } else {
      const isOut = row.available === 0
      const isLow = row.reorderThreshold > 0 && row.available > 0 && row.available <= row.reorderThreshold
      map.set(row.productId, {
        productId:      row.productId,
        productName:    row.productName,
        rows:           [row],
        totalOnHand:    row.onHand,
        totalReserved:  row.reserved,
        totalAvailable: row.available,
        hasOut:         isOut,
        hasLow:         isLow,
      })
    }
  }
  return Array.from(map.values())
}

// ─── Inline adjustment form (expands below a variant row) ───────────────────

function AdjustForm({ row, onDone }: { row: StockRow; onDone: () => void }) {
  const [qty,       setQty]       = useState('')
  const [type,      setType]      = useState<AdjustmentType>('adjustment_in')
  const [note,      setNote]      = useState('')
  const [error,     setError]     = useState('')
  const [isPending, startTransition] = useTransition()

  const isOutbound = OUTBOUND.has(type)

  const handleSubmit = () => {
    setError('')
    const n = Number(qty)
    if (!n || Number.isNaN(n) || n <= 0) {
      setError('Enter a positive quantity.')
      return
    }
    startTransition(async () => {
      const result = await adjustStockAction({
        productId: row.productId,
        sellerId:  row.sellerId,
        variantId: row.variantId,
        delta:     isOutbound ? -Math.abs(n) : Math.abs(n),
        type,
        note:      note.trim() || undefined,
      })
      if ('error' in result) { setError(result.error); return }
      onDone()
    })
  }

  return (
    <div className="px-5 py-4 bg-slate-50 border-t border-slate-100">
      <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">
        Adjust stock
        {row.variantName ? ` · ${row.variantName}` : ''}
        {row.variantSku  ? ` (${row.variantSku})`  : ''}
      </p>
      <div className="flex flex-wrap items-end gap-3">
        {/* Quantity */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Quantity
          </label>
          <div className="flex items-center gap-1.5">
            <span className={`text-sm font-bold w-4 text-center ${isOutbound ? 'text-rose-500' : 'text-emerald-600'}`}>
              {isOutbound ? '−' : '+'}
            </span>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="0"
              className="w-24 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#558476]/40 focus:border-[#558476]"
            />
          </div>
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Reason
          </label>
          <div className="relative">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AdjustmentType)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#558476]/40 focus:border-[#558476] cursor-pointer"
            >
              {ADJUSTMENT_TYPES.map((t) => (
                <option key={t} value={t}>{ADJUSTMENT_LABELS[t]}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Note */}
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Note <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. counted during stocktake"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#558476]/40 focus:border-[#558476]"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="px-4 py-2 bg-[#558476] hover:bg-[#457366] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending ? 'Saving…' : 'Apply'}
          </button>
          <button
            onClick={onDone}
            className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-rose-600 mt-2">{error}</p>}
    </div>
  )
}

// ─── Stock level badge ───────────────────────────────────────────────────────

function StockBadge({ available, reorderThreshold }: { available: number; reorderThreshold: number }) {
  if (available === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 text-rose-600 text-xs font-semibold border border-rose-100">
        Out of stock
      </span>
    )
  }
  if (reorderThreshold > 0 && available <= reorderThreshold) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-100">
        <AlertTriangle className="w-3 h-3" />
        {available} left
      </span>
    )
  }
  return <span className="text-sm text-slate-700 font-medium">{available}</span>
}

// ─── Main table ──────────────────────────────────────────────────────────────

export function InventoryTable({ stock }: { stock: StockRow[] }) {
  const [search,    setSearch]    = useState('')
  const [filter,    setFilter]    = useState<StockLevel>('all')
  const [openRow,   setOpenRow]   = useState<string | null>(null)   // row.id of adjust form
  const [expanded,  setExpanded]  = useState<Set<string>>(new Set()) // productIds

  const allGroups = groupByProduct(stock)

  // Apply search + stock-level filter at the group level
  const groups = allGroups.filter((g) => {
    if (search) {
      const term = search.toLowerCase()
      const matchesProduct = g.productName.toLowerCase().includes(term)
      const matchesVariant = g.rows.some((row) =>
        row.variantName?.toLowerCase().includes(term)
        || row.variantSku?.toLowerCase().includes(term),
      )
      if (!matchesProduct && !matchesVariant) return false
    }
    if (filter === 'out') return g.hasOut || g.totalAvailable === 0
    if (filter === 'low') return g.hasLow
    return true
  })

  const toggleExpanded = (productId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(productId) ? next.delete(productId) : next.add(productId)
      return next
    })
  }

  const TABS: { label: string; value: StockLevel; count: number }[] = [
    { label: 'All',        value: 'all', count: allGroups.length },
    { label: 'Low stock',  value: 'low', count: allGroups.filter((g) => g.hasLow).length },
    { label: 'Out of stock', value: 'out', count: allGroups.filter((g) => g.hasOut || g.totalAvailable === 0).length },
  ]

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">

      {/* Filter tabs */}
      <div className="flex items-center gap-0.5 px-4 pt-3 border-b border-slate-100 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors border-b-2 -mb-px ${
              filter === tab.value
                ? 'text-[#558476] border-[#558476]'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              filter === tab.value
                ? 'bg-[#558476]/10 text-[#558476]'
                : 'bg-slate-100 text-slate-400'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#558476]/30 focus:border-[#558476] placeholder:text-slate-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {(search || filter !== 'all') && (
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{groups.length}</span> of{' '}
            <span className="font-semibold text-slate-700">{allGroups.length}</span> products
          </p>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Product / Variant</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">On Hand</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Reserved</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Available</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Reorder At</th>
              <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Adjust</th>
            </tr>
          </thead>

          <tbody>
            {groups.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <PackageOpen className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">
                        {search || filter !== 'all' ? 'No products match your filters' : 'No stock records yet'}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {search || filter !== 'all' ? 'Try adjusting your search or filter' : 'Stock is created when you adjust quantities on products'}
                      </p>
                    </div>
                    {(search || filter !== 'all') && (
                      <button onClick={() => { setSearch(''); setFilter('all') }} className="text-xs text-[#558476] hover:underline">
                        Clear filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              groups.map((group) => {
                const isExpanded   = expanded.has(group.productId)
                const hasVariants  = group.rows.length > 1 || group.rows[0]?.variantName !== null
                const singleRow    = group.rows[0]
                const groupIsLow   = group.hasLow
                const groupIsOut   = group.hasOut || group.totalAvailable === 0

                return (
                  <Fragment key={group.productId}>
                    {/* ── Product group header row ── */}
                    <tr
                      className={`border-t border-slate-100 ${hasVariants ? 'cursor-pointer hover:bg-slate-50/60' : 'hover:bg-slate-50/60'} transition-colors`}
                      onClick={() => hasVariants && toggleExpanded(group.productId)}
                    >
                      {/* Product name + expand toggle */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          {hasVariants ? (
                            <span className="text-slate-400 flex-shrink-0">
                              {isExpanded
                                ? <ChevronDown className="w-4 h-4" />
                                : <ChevronRight className="w-4 h-4" />}
                            </span>
                          ) : (
                            <span className="w-4 flex-shrink-0 flex items-center justify-center">
                              <Package className="w-3.5 h-3.5 text-slate-300" />
                            </span>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{group.productName}</p>
                            {hasVariants && (
                              <p className="text-xs text-slate-400 mt-0.5">
                                {group.rows.length} variant{group.rows.length !== 1 ? 's' : ''}
                                {!isExpanded && (groupIsOut
                                  ? <span className="ml-1.5 text-rose-500 font-medium">· some out of stock</span>
                                  : groupIsLow
                                    ? <span className="ml-1.5 text-amber-600 font-medium">· some low stock</span>
                                    : null
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Aggregate stock numbers for multi-variant products */}
                      <td className="px-5 py-3.5 text-sm text-slate-600 font-medium">{group.totalOnHand}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-400">{group.totalReserved}</td>
                      <td className="px-5 py-3.5">
                        {hasVariants ? (
                          <span className="text-sm text-slate-600 font-medium">{group.totalAvailable}</span>
                        ) : (
                          <StockBadge available={singleRow.available} reorderThreshold={singleRow.reorderThreshold} />
                        )}
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell text-sm text-slate-400">
                        {!hasVariants && singleRow.reorderThreshold > 0 ? singleRow.reorderThreshold : hasVariants ? '—' : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {!hasVariants && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenRow(openRow === singleRow.id ? null : singleRow.id) }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors"
                          >
                            Adjust
                            <ChevronDown className={`w-3 h-3 transition-transform ${openRow === singleRow.id ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Adjust form for no-variant product */}
                    {!hasVariants && openRow === singleRow.id && (
                      <tr>
                        <td colSpan={6} className="p-0">
                          <AdjustForm row={singleRow} onDone={() => setOpenRow(null)} />
                        </td>
                      </tr>
                    )}

                    {/* ── Variant sub-rows (shown when expanded) ── */}
                    {hasVariants && isExpanded && group.rows.map((row) => {
                      const isAdjusting = openRow === row.id
                      return (
                        <Fragment key={row.id}>
                          <tr className="border-t border-slate-50 bg-slate-50/30 hover:bg-slate-50/70 transition-colors">
                            {/* Variant label — indented */}
                            <td className="pl-12 pr-5 py-3">
                              <div>
                                <p className="text-sm text-slate-700 font-medium">
                                  {row.variantName ?? 'Single product'}
                                </p>
                                {row.variantSku && (
                                  <p className="text-xs text-slate-400 font-mono mt-0.5">{row.variantSku}</p>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3 text-sm text-slate-600">{row.onHand}</td>
                            <td className="px-5 py-3 text-sm text-slate-400">{row.reserved}</td>
                            <td className="px-5 py-3">
                              <StockBadge available={row.available} reorderThreshold={row.reorderThreshold} />
                            </td>
                            <td className="px-5 py-3 hidden md:table-cell text-sm text-slate-400">
                              {row.reorderThreshold > 0 ? row.reorderThreshold : '—'}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <button
                                onClick={() => setOpenRow(isAdjusting ? null : row.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-white hover:border-slate-300 transition-colors"
                              >
                                Adjust
                                <ChevronDown className={`w-3 h-3 transition-transform ${isAdjusting ? 'rotate-180' : ''}`} />
                              </button>
                            </td>
                          </tr>
                          {isAdjusting && (
                            <tr>
                              <td colSpan={6} className="p-0">
                                <AdjustForm row={row} onDone={() => setOpenRow(null)} />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {groups.length > 0 && (
        <div className="px-5 py-3 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            {groups.length} product{groups.length !== 1 ? 's' : ''}
            {' · '}
            {stock.length} stock record{stock.length !== 1 ? 's' : ''}
            {(search || filter !== 'all') ? ' matching current filters' : ' total'}
          </p>
        </div>
      )}
    </div>
  )
}
