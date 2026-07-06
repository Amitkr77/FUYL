'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Trash2, CheckCircle2, ImagePlus } from 'lucide-react'
import type { Product } from '@/lib/mock-data'

const CATEGORIES = ['Nutrition', 'Bundle', 'Immunity', 'Energy', 'Gut Health']

interface Props {
  product?: Product
  isNew?: boolean
}

export function ProductForm({ product, isNew = false }: Props) {
  const router = useRouter()
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    category: product?.category ?? 'Nutrition',
    price: product?.price ?? 1499,
    stock: product?.stock ?? 0,
    status: product?.status ?? ('draft' as Product['status']),
    description:
      product
        ? 'Complete daily nutrition in one sachet. 60+ premium ingredients including KSM-66 Ashwagandha, Bacillus Coagulans, Magnesium Glycinate, and more. Clinically dosed. No proprietary blends. FSSAI certified.'
        : '',
  })

  const set = (k: Partial<typeof form>) => setForm((f) => ({ ...f, ...k }))

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      if (isNew) router.push('/products')
    }, 2000)
  }

  const inputCls =
    'w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/products"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {isNew ? 'New Product' : 'Edit Product'}
            </h2>
            <p className="text-sm text-slate-500">
              {isNew ? 'Create a new product listing' : `Editing: ${product?.name}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <button
              type="button"
              onClick={() => router.push('/products')}
              className="flex items-center gap-2 px-4 py-2 border border-red-200 bg-white text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-[#558476] hover:bg-[#457366] text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : isNew ? 'Create Product' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main — 2/3 */}
        <div className="lg:col-span-2 space-y-5">
          {/* Basic info */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Product Information</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Product Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="e.g. FUYL COMPLETE+"
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">SKU</label>
                <input
                  type="text"
                  value={form.sku}
                  onChange={(e) => set({ sku: e.target.value })}
                  placeholder="e.g. FC-15"
                  className={`${inputCls} font-mono`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => set({ category: e.target.value })}
                  className={inputCls}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => set({ description: e.target.value })}
                rows={4}
                placeholder="Describe the product..."
                className={`${inputCls} resize-none`}
              />
            </div>
          </div>

          {/* Image placeholder */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Product Image</h3>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-[#558476]/40 transition-colors cursor-pointer">
              <ImagePlus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500 font-medium">Click to upload product image</p>
              <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 5MB</p>
            </div>
            {product && (
              <div className="mt-3 flex items-center gap-3">
                <div className="w-16 h-16 rounded-lg bg-[#558476]/10 flex items-center justify-center">
                  <span className="text-[#558476] text-xl font-bold">{product.name.charAt(0)}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Current image</p>
                  <p className="text-xs text-slate-400">Upload a new one to replace</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar — 1/3 */}
        <div className="space-y-5">
          {/* Status */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Status</h3>
            <select
              value={form.status}
              onChange={(e) => set({ status: e.target.value as Product['status'] })}
              className={inputCls}
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
            <p className="text-xs text-slate-400 mt-2">
              {form.status === 'active'
                ? 'Visible on the storefront'
                : form.status === 'draft'
                ? 'Hidden from customers'
                : 'Removed from store'}
            </p>
          </div>

          {/* Pricing */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Pricing</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Price (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => set({ price: Number(e.target.value) })}
                  className={`${inputCls} pl-8`}
                />
              </div>
            </div>
          </div>

          {/* Inventory */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Inventory</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Stock Quantity
              </label>
              <input
                type="number"
                value={form.stock}
                onChange={(e) => set({ stock: Number(e.target.value) })}
                className={inputCls}
              />
            </div>
            {form.stock === 0 && (
              <p className="text-xs text-red-500 mt-2">⚠ Out of stock — will show as unavailable</p>
            )}
            {form.stock > 0 && form.stock < 20 && (
              <p className="text-xs text-amber-500 mt-2">⚠ Low stock — consider restocking</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
