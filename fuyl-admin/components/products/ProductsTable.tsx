'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Search, Edit2, Archive, ChevronDown, X, PackageOpen } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import type { AdminProduct, ProductStatus } from '@/lib/products'
import { archiveProductAction } from '@/app/(admin)/products/actions'
import { Pagination } from '@/components/ui/Pagination'

type TabFilter = 'all' | ProductStatus
type SortKey = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc'

const TABS: { label: string; value: TabFilter }[] = [
  { label: 'All',      value: 'all'      },
  { label: 'Active',   value: 'active'   },
  { label: 'Draft',    value: 'draft'    },
  { label: 'Archived', value: 'archived' },
]

const SORT_OPTIONS: { label: string; value: SortKey }[] = [
  { label: 'Name A → Z',          value: 'name-asc'   },
  { label: 'Name Z → A',          value: 'name-desc'  },
  { label: 'Price: Low → High',   value: 'price-asc'  },
  { label: 'Price: High → Low',   value: 'price-desc' },
]

function unifiedStatus(status: ProductStatus, isPublished: boolean) {
  if (status === 'archived') return { label: 'Archived', variant: 'danger'   as const }
  if (status === 'draft')    return { label: 'Draft',    variant: 'default'  as const }
  if (!isPublished)          return { label: 'Hidden',   variant: 'warning'  as const }
  return                            { label: 'Active',   variant: 'success'  as const }
}

function sorted(products: AdminProduct[], key: SortKey): AdminProduct[] {
  return [...products].sort((a, b) => {
    switch (key) {
      case 'name-asc':   return a.name.localeCompare(b.name)
      case 'name-desc':  return b.name.localeCompare(a.name)
      case 'price-asc':  return a.price - b.price
      case 'price-desc': return b.price - a.price
    }
  })
}

export function ProductsTable({ products }: { products: AdminProduct[] }) {
  const [activeTab,   setActiveTab]   = useState<TabFilter>('all')
  const [search,      setSearch]      = useState('')
  const [sortKey,     setSortKey]     = useState<SortKey>('name-asc')
  const [page,        setPage]        = useState(1)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [archivingId,  setArchivingId]  = useState<string | null>(null)
  const [isPending,    startTransition] = useTransition()
  const PAGE_SIZE = 15

  const hasFilters = search !== ''

  const filtered = sorted(
    products.filter((p) => {
      if (activeTab !== 'all' && p.status !== activeTab) return false
      if (search) {
        const q = search.toLowerCase()
        const matchName  = p.name.toLowerCase().includes(q)
        const matchSku   = p.variants.some((v) => v.sku.toLowerCase().includes(q))
        const matchBrand = (p.brand ?? '').toLowerCase().includes(q)
        const matchTags  = p.tags.some((t) => t.toLowerCase().includes(q))
        const matchDesc  = (p.shortDescription ?? '').toLowerCase().includes(q)
        if (!matchName && !matchSku && !matchBrand && !matchTags && !matchDesc) return false
      }
      return true
    }),
    sortKey
  )

  const pageCount  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const curPage    = Math.min(page, pageCount)
  const paged      = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE)

  const tabCount = (tab: TabFilter) =>
    tab === 'all' ? products.length : products.filter((p) => p.status === tab).length

  const handleArchive = (id: string) => {
    setArchivingId(id)
    setConfirmingId(null)
    startTransition(async () => {
      await archiveProductAction(id)
      setArchivingId(null)
    })
  }

  const clearFilters = () => { setSearch(''); setActiveTab('all'); setPage(1) }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">

      {/* Status tabs ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 px-4 pt-3 border-b border-slate-100 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setActiveTab(tab.value); setPage(1) }}
            className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors border-b-2 -mb-px ${
              activeTab === tab.value
                ? 'text-[#558476] border-[#558476]'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            {tab.label}
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                activeTab === tab.value
                  ? 'bg-[#558476]/10 text-[#558476]'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {tabCount(tab.value)}
            </span>
          </button>
        ))}
      </div>

      {/* Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 py-3 border-b border-slate-100">
        {/* Search */}
        <div className="relative flex-1 min-w-0 w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, SKU, brand, tags…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#558476]/30 focus:border-[#558476] placeholder:text-slate-400 transition-shadow"
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setPage(1) }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {/* Sort */}
          <div className="relative">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="appearance-none h-9 pl-3 pr-8 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#558476]/30 focus:border-[#558476] cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={() => { setSearch('') }}
              className="h-9 px-3 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Active-filter summary */}
      {(hasFilters || activeTab !== 'all') && (
        <div className="px-5 py-2 bg-slate-50/60 border-b border-slate-100">
          <p className="text-xs text-slate-500">
            Showing{' '}
            <span className="font-semibold text-slate-700">{filtered.length}</span> of{' '}
            <span className="font-semibold text-slate-700">{products.length}</span> products
          </p>
        </div>
      )}

      {/* Table ───────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Product</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Variants / SKU</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Price</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Status</th>
              <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <PackageOpen className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">
                        {hasFilters || activeTab !== 'all'
                          ? 'No products match your filters'
                          : 'No products yet'}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {hasFilters || activeTab !== 'all'
                          ? 'Try adjusting your search or filters'
                          : 'Add your first product to get started'}
                      </p>
                    </div>
                    {(hasFilters || activeTab !== 'all') && (
                      <button
                        onClick={clearFilters}
                        className="text-xs text-[#558476] hover:underline"
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paged.map((product) => {
                const status  = unifiedStatus(product.status, product.isPublished)
                const isConfirming = confirmingId === product.id
                const isArchiving  = isPending && archivingId === product.id

                return (
                  <tr key={product.id} className="hover:bg-slate-50/60 transition-colors">

                    {/* Product — image + name + category */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.imageUrl}
                            alt=""
                            className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-slate-100"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-[#558476]/10 rounded-xl flex items-center justify-center flex-shrink-0 border border-[#558476]/10">
                            <span className="text-[#558476] text-sm font-bold leading-none">
                              {product.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate leading-snug">{product.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">{product.variants[0]?.sku || '—'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Variants / SKU */}
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      {product.variants.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center w-fit px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-xs font-medium">
                            {product.variants.length} variant{product.variants.length !== 1 ? 's' : ''}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {product.variants[0].sku || '—'}
                            {product.variants.length > 1 && (
                              <span className="text-slate-300 not-italic"> +{product.variants.length - 1}</span>
                            )}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center w-fit px-1.5 py-0.5 rounded-md border border-dashed border-slate-200 text-slate-400 text-xs">
                            No variants
                          </span>
                          <span className="text-xs text-slate-400 font-mono">{product.sku || '—'}</span>
                        </div>
                      )}
                    </td>

                    {/* Price */}
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-slate-800">{formatCurrency(product.price)}</p>
                      {product.compareAtPrice && product.compareAtPrice > product.price && (
                        <p className="text-xs text-slate-400 line-through mt-0.5">
                          {formatCurrency(product.compareAtPrice)}
                        </p>
                      )}
                    </td>

                    {/* Status — single badge merging status + isPublished */}
                    <td className="px-5 py-3.5">
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </td>

                    {/* Actions — 2-step archive confirmation to prevent accidents */}
                    <td className="px-5 py-3.5">
                      {isConfirming ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-xs text-slate-500 whitespace-nowrap">Archive?</span>
                          <button
                            onClick={() => handleArchive(product.id)}
                            disabled={isArchiving}
                            className="px-2.5 py-1 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors disabled:opacity-60"
                          >
                            {isArchiving ? '…' : 'Yes'}
                          </button>
                          <button
                            onClick={() => setConfirmingId(null)}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-0.5">
                          <Link
                            href={`/products/${product.id}`}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-[#558476] hover:bg-[#558476]/10 rounded-lg transition-colors"
                            title="Edit product"
                          >
                            <Edit2 className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="hidden sm:inline">Edit</span>
                          </Link>
                          {product.status !== 'archived' && (
                            <button
                              onClick={() => setConfirmingId(product.id)}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Archive product"
                            >
                              <Archive className="w-3.5 h-3.5 flex-shrink-0" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={curPage}
        pageCount={pageCount}
        total={filtered.length}
        pageSize={PAGE_SIZE}
        onPage={setPage}
      />
    </div>
  )
}
