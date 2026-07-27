'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, CheckCircle2, ImagePlus, AlertCircle, X } from 'lucide-react'
import type { AdminCategory, AdminCategoryInput } from '@/lib/categories'
import { createCategoryAction, updateCategoryAction, getCategoryImageUploadSignature } from '@/app/(admin)/categories/actions'
import { uploadImage } from '@/lib/upload'
import { Toggle } from '@/components/ui/Toggle'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

interface Props {
  category?: AdminCategory
  allCategories: AdminCategory[]
  isNew?: boolean
}

const inputCls =
  'w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent'
const labelCls = 'block text-sm font-medium text-slate-700 mb-1.5'
const helpCls = 'text-xs text-slate-400 mt-1.5'
const cardCls = 'bg-white border border-slate-200 rounded-xl shadow-sm p-6'

export function CategoryForm({ category, allCategories, isNew = false }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<AdminCategoryInput>({
    name: category?.name ?? '',
    description: category?.description ?? '',
    parentId: category?.parentId ?? '',
    imageUrl: category?.imageUrl ?? '',
    isActive: category?.isActive ?? true,
    sortOrder: category?.sortOrder ?? 0,
  })
  const set = (k: Partial<AdminCategoryInput>) => setForm((f) => ({ ...f, ...k }))

  // A category can't be its own parent — everything else is fair game (this
  // is a shallow one-level parent tree, not deep enough to need full
  // cycle detection).
  const parentOptions = [
    { value: '', label: 'None (top-level category)' },
    ...allCategories.filter((c) => c.id !== category?.id).map((c) => ({ value: c.id, label: c.name })),
  ]

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    setIsUploading(true)
    const result = await uploadImage(file, getCategoryImageUploadSignature)
    if ('error' in result) setError(result.error)
    else set({ imageUrl: result.url })
    setIsUploading(false)
  }

  const handleSave = () => {
    setError('')
    if (!form.name.trim()) {
      setError('Category name is required.')
      return
    }
    startTransition(async () => {
      const result = isNew
        ? await createCategoryAction(form)
        : await updateCategoryAction(category!.id, form)
      // A successful action redirects server-side and never returns here —
      // reaching this point means it returned an error instead.
      if (result?.error) {
        setError(result.error)
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/categories" className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{isNew ? 'New Category' : 'Edit Category'}</h2>
            <p className="text-sm text-slate-500">{isNew ? 'Create a new product category' : `Editing: ${category?.name}`}</p>
          </div>
        </div>
        <button type="button" onClick={handleSave} disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 bg-[#558476] hover:bg-[#457366] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
          {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved!' : isPending ? 'Saving…' : isNew ? 'Create Category' : 'Save Changes'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className={`${cardCls} space-y-4`}>
        <div>
          <label className={labelCls}>Name</label>
          <input type="text" value={form.name} onChange={(e) => set({ name: e.target.value })}
            placeholder="e.g. Supplements" className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Description</label>
          <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} rows={3}
            placeholder="Optional description..." className={`${inputCls} resize-none`} />
        </div>

        <div>
          <label className={labelCls}>Parent Category</label>
          <SearchableSelect
            options={parentOptions}
            value={form.parentId}
            onChange={(v) => set({ parentId: v })}
            placeholder="None (top-level category)"
            emptyText="No matching categories"
          />
        </div>

        <div>
          <label className={labelCls}>Image</label>
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleImageChange} />
          {form.imageUrl ? (
            <div className="relative w-20 h-20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.imageUrl} alt="" className="w-full h-full rounded-lg object-cover border border-slate-200" />
              <button type="button" onClick={() => set({ imageUrl: '' })}
                className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading}
              className="w-20 h-20 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-[#558476]/40 transition-colors disabled:opacity-60">
              <ImagePlus className="w-5 h-5 text-slate-300" />
              <span className="text-[10px] text-slate-400">{isUploading ? 'Uploading…' : 'Upload'}</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 items-center pt-1">
          <div>
            <label className={labelCls}>Sort Order</label>
            <input type="number" value={form.sortOrder} onChange={(e) => set({ sortOrder: Number(e.target.value) })} className={inputCls} />
            <p className={helpCls}>Lower numbers appear first.</p>
          </div>
          <Toggle
            checked={form.isActive}
            onChange={(v) => set({ isActive: v })}
            label="Active"
            description="Visible on the storefront and selectable on products"
          />
        </div>
      </div>
    </div>
  )
}
