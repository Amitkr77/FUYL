'use client'

import { useRef, useState, useTransition } from 'react'
import { Save, CheckCircle2, Trash2, AlertCircle, ImagePlus } from 'lucide-react'
import type { IngredientRecord } from '@/lib/content'
import { INGREDIENT_CATEGORIES } from '@/lib/ingredientCategory'
import { updateIngredientAction, deleteIngredientAction, getContentImageUploadSignature } from '@/app/(admin)/content/actions'
import { uploadImage } from '@/lib/upload'
import { Input, Textarea, Select, Checkbox, FormSection } from '@/components/ui/form'

export function EditIngredientForm({ ingredient }: { ingredient: IngredientRecord }) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    name: ingredient.name, amount: ingredient.amount, benefit: ingredient.benefit,
    description: ingredient.description, image: ingredient.image, category: ingredient.category,
    clinicalBacking: ingredient.clinicalBacking, isActive: ingredient.isActive, order:ingredient.order,
  })

  const set = (k: Partial<typeof form>) => setForm((f) => ({ ...f, ...k }))

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    setIsUploading(true)
    const result = await uploadImage(file, getContentImageUploadSignature)
    setIsUploading(false)
    if ('error' in result) { setError(result.error); return }
    set({ image: result.url })
  }

  const handleSave = () => {
    setError('')
    startTransition(async () => {
      const result = await updateIngredientAction(ingredient.id, form)
      if (result?.error) { setError(result.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  const handleDelete = () => {
    startTransition(() => deleteIngredientAction(ingredient.id))
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Edit Ingredient</h2>
            <p className="text-sm text-slate-500 truncate max-w-xs">{ingredient.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleDelete} disabled={isPending} className="flex items-center gap-2 px-4 py-2 border border-red-200 bg-white text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          <button onClick={handleSave} disabled={isPending} className="flex items-center gap-2 px-4 py-2 bg-[#558476] hover:bg-[#457366] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
            {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : isPending ? 'Saving\u2026' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <FormSection>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Name" value={form.name} onChange={(e) => set({ name: e.target.value })} />
              <Input label="Amount" value={form.amount} onChange={(e) => set({ amount: e.target.value })} />
            </div>
            <Input label="Benefit (short tagline)" value={form.benefit} onChange={(e) => set({ benefit: e.target.value })} />
            <Textarea label="Description" value={form.description} onChange={(e) => set({ description: e.target.value })} rows={6} />
            <div>
              <Textarea label="Clinical Backing (optional)" value={form.clinicalBacking} onChange={(e) => set({ clinicalBacking: e.target.value })} rows={3} maxLength={500} />
              <p className="text-xs text-slate-400 mt-1.5">{form.clinicalBacking.length}/500</p>
            </div>
          </FormSection>
        </div>

        <div className="space-y-5">
          <FormSection title="Settings">
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => set({ category: e.target.value as typeof form.category })}
              options={INGREDIENT_CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
            <Checkbox
              label="Active (visible on storefront)"
              checked={form.isActive}
              onChange={(e) => set({ isActive: e.target.checked })}
            />
          </FormSection>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Image</h3>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleImageChange} />
            {form.image ? (
              <div className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.image} alt="" className="w-full aspect-square rounded-lg object-cover border border-slate-200" />
                <div className="absolute inset-0 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="px-3 py-1.5 rounded-lg bg-white text-xs font-medium text-slate-700 hover:text-[#558476]">
                    {isUploading ? 'Uploading\u2026' : 'Replace'}
                  </button>
                  <button type="button" onClick={() => set({ image: '' })} className="px-3 py-1.5 rounded-lg bg-white text-xs font-medium text-red-500">
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading}
                className="w-full aspect-square border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center gap-1.5 hover:border-[#558476]/40 transition-colors disabled:opacity-60">
                <ImagePlus className="w-6 h-6 text-slate-300" />
                <span className="text-xs text-slate-500 font-medium">{isUploading ? 'Uploading\u2026' : 'Click to upload image'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
