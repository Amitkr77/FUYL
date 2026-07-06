'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Edit2, Archive, AlertTriangle } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { MOCK_PRODUCTS, ProductStatus, Product } from '@/lib/mock-data'
import { formatCurrency } from '@/lib/utils'

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

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState<TabFilter>('all')
  const [search, setSearch] = useState('')

  const filtered = MOCK_PRODUCTS.filter((p: Product) => {
    const matchTab = activeTab === 'all' || p.status === activeTab
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
    return matchTab && matchSearch
  })

  const tabCount = (tab: TabFilter) =>
    tab === 'all'
      ? MOCK_PRODUCTS.length
      : MOCK_PRODUCTS.filter((p: Product) => p.status === tab).length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Products</h2>
          <p className="text-sm text-slate-500 mt-0.5">{MOCK_PRODUCTS.length} total products</p>
        </div>
        <Link
          href="/products/new"
          className="flex items-center gap-2 px-4 py-2 bg-[#558476] hover:bg-[#457366] text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </Link>
      </div>

      {/* Filters */}
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
                filtered.map((product: Product) => (
                  <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#558476]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-[#558476] text-xs font-bold">
                            {product.name.charAt(0)}
                          </span>
                        </div>
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
                      <Badge variant={statusVariant(product.status)}>
                        {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                      </Badge>
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
                          className="p-1.5 text-slate-400 hover:text-[#B76E79] hover:bg-[#B76E79]/10 rounded-lg transition-colors"
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
    </div>
  )
}
