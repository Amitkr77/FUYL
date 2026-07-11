'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Search, Edit2, Archive, AlertTriangle } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import type { AdminProduct, ProductStatus } from '@/lib/products'
import { archiveProductAction } from '@/app/(admin)/products/actions'

type TabFilter = 'all' | ProductStatus

const TABS: { label: string; value: TabFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Draft', value: 'draft' },
  { label: 'Archived', value: 'archived' },
]

const statusVariant = (status: ProductStatus): 'success' | 'default' | 'danger' => {
  switch (status) {
    case 'active': return 'success'
    case 'draft': return 'default'
    case 'archived': return 'danger'
  }
}

export function ProductsTable({ products }: { products: AdminProduct[] }) {
  const [activeTab, setActiveTab] = useState<TabFilter>('all')
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()
  const [archivingId, setArchivingId] = useState<string | null>(null)

  const filtered = products.filter((p) => {
    const matchTab = activeTab === 'all' || p.status === activeTab
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
    return matchTab && matchSearch
  })

  const tabCount = (tab: TabFilter) =>
    tab === 'all' ? products.length : products.filter((p) => p.status === tab).length

  const handleArchive = (id: string) => {
    setArchivingId(id)
    startTransition(async () => {
      await archiveProductAction(id)
      setArchivingId(null)
    })
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 pt-4 border-b border-slate-100">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
              activeTab === tab.value
                ? 'text-[#558476] border-[#558476]'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            {tab.label}
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
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

      {/* Search */}
      <div className="p-4 border-b border-slate-100">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search products or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Product</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">SKU</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Category</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Price</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Stock</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-slate-400 text-sm">
                  No products found.
                </td>
              </tr>
            ) : (
              filtered.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 bg-[#558476]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-[#558476] text-xs font-bold">
                            {product.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <span className="text-sm font-medium text-slate-900">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500 hidden md:table-cell font-mono">{product.sku}</td>
                  <td className="px-5 py-4 text-sm text-slate-500 hidden lg:table-cell">{product.category}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-slate-900">{formatCurrency(product.price)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      {product.stock === 0 ? (
                        <Badge variant="danger">Out of stock</Badge>
                      ) : product.stock < 20 ? (
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-sm text-amber-600 font-medium">{product.stock}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-700">{product.stock}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <Badge variant={statusVariant(product.status)}>
                        {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                      </Badge>
                      {!product.isPublished && <Badge variant="default">Hidden</Badge>}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/products/${product.id}`}
                        className="p-1.5 text-slate-400 hover:text-[#558476] hover:bg-[#558476]/10 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleArchive(product.id)}
                        disabled={isPending && archivingId === product.id}
                        className="p-1.5 text-slate-400 hover:text-[#B76E79] hover:bg-[#B76E79]/10 rounded-lg transition-colors disabled:opacity-50"
                        title="Archive"
                      >
                        <Archive className="w-4 h-4" />
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
