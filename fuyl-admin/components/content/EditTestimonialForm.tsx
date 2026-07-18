'use client'

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, CheckCircle2, Trash2, AlertCircle, ImagePlus, Star } from 'lucide-react'
import type { TestimonialRecord } from '@/lib/content'
import { updateTestimonialAction, deleteTestimonialAction, getContentImageUploadSignature } from '@/app/(admin)/content/actions'
import { uploadImage } from '@/lib/upload'

const inputCls = 'w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent'

export function EditTestimonialForm({ testimonial }: { testimonial: TestimonialRecord }) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    name: testimonial.name, title: testimonial.title, type: testimonial.type, body: testimonial.body,
    rating: testimonial.rating, image: testimonial.image, isActive: testimonial.isActive,
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
      const result = await updateTestimonialAction(testimonial.id, form)
      if (result?.error) { setError(result.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  const handleDelete = () => {
    startTransition(() => deleteTestimonialAction(testimonial.id))
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/content?tab=testimonials" className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Edit Testimonial</h2>
            <p className="text-sm text-slate-500 truncate max-w-xs">{testimonial.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleDelete} disabled={isPending} className="flex items-center gap-2 px-4 py-2 border border-red-200 bg-white text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          <button onClick={handleSave} disabled={isPending} className="flex items-center gap-2 px-4 py-2 bg-[#558476] hover:bg-[#457366] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
            {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
            <input type="text" value={form.name} onChange={(e) => set({ name: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Title (optional)</label>
            <input type="text" value={form.title} onChange={(e) => set({ title: e.target.value })} className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
            <select value={form.type} onChange={(e) => set({ type: e.target.value as 'expert' | 'customer' })} className={inputCls}>
              <option value="customer">Customer</option>
              <option value="expert">Expert</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Rating (optional)</label>
            <div className="flex items-center gap-1 h-[42px]">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => set({ rating: form.rating === n ? undefined : n })}>
                  <Star className={`w-5 h-5 ${form.rating && n <= form.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Testimonial</label>
          <textarea value={form.body} onChange={(e) => set({ body: e.target.value })} rows={5} maxLength={1000} className={`${inputCls} resize-none`} />
          <p className="text-xs text-slate-400 mt-1.5">{form.body.length}/1000</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Photo (optional)</label>
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleImageChange} />
          {form.image ? (
            <div className="relative group w-24 h-24">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.image} alt="" className="w-24 h-24 rounded-full object-cover border border-slate-200" />
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button type="button" onClick={() => set({ image: '' })} className="text-xs font-medium text-white">Remove</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading}
              className="w-24 h-24 border-2 border-dashed border-slate-200 rounded-full flex flex-col items-center justify-center hover:border-[#558476]/40 transition-colors disabled:opacity-60">
              <ImagePlus className="w-5 h-5 text-slate-300" />
            </button>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700 pt-2 border-t border-slate-100">
          <input type="checkbox" checked={form.isActive} onChange={(e) => set({ isActive: e.target.checked })} className="rounded border-slate-300 text-[#558476] focus:ring-[#558476]" />
          Active (visible on storefront)
        </label>
      </div>
    </div>
  )
}
