'use client'

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, CheckCircle2, Eye, Trash2, AlertCircle, ImagePlus, X, Code, Plus } from 'lucide-react'
import type { BlogPostDetail } from '@/lib/blog'
import { updatePostAction, deletePostAction, getBlogImageUploadSignature } from '@/app/(admin)/blog/actions'
import { uploadImage } from '@/lib/upload'

const CATEGORIES = ['Nutrition Science', 'Ingredients', 'Industry Insights', 'Lifestyle', 'Research']
const AUTHORS = ['FUYL Team', 'Dr. Rima Khanna', 'Anjali Mehta', 'Vikram Rao']

const inputCls = 'w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent'

export function EditBlogPostForm({ post }: { post: BlogPostDetail }) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [tagInput, setTagInput] = useState('')
  const [form, setForm] = useState({
    title: post.title,
    excerpt: post.excerpt,
    category: post.category,
    tags: post.tags,
    author: post.author,
    status: post.status,
    content: post.content,
    image: post.image,
  })

  const set = (k: Partial<typeof form>) => setForm((f) => ({ ...f, ...k }))

  const addTag = () => {
    const value = tagInput.trim()
    if (!value || form.tags.includes(value)) { setTagInput(''); return }
    set({ tags: [...form.tags, value] })
    setTagInput('')
  }
  const removeTag = (tag: string) => set({ tags: form.tags.filter((t) => t !== tag) })

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    setIsUploading(true)
    const result = await uploadImage(file, getBlogImageUploadSignature)
    setIsUploading(false)
    if ('error' in result) { setError(result.error); return }
    set({ image: result.url })
  }

  const save = (overrides: Partial<typeof form> = {}) => {
    setError('')
    const input = { ...form, ...overrides }
    if (Object.keys(overrides).length) set(overrides)
    startTransition(async () => {
      const result = await updatePostAction(post.id, input)
      if (result?.error) {
        setError(result.error)
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  const handleDelete = () => {
    startTransition(() => deletePostAction(post.id))
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/blog" className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Edit Post</h2>
            <p className="text-sm text-slate-500 truncate max-w-xs">{post.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleDelete} disabled={isPending} className="flex items-center gap-2 px-4 py-2 border border-red-200 bg-white text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          <button
            onClick={() => save({ status: form.status === 'published' ? 'draft' : 'published' })}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <Eye className="w-4 h-4" />
            {form.status === 'published' ? 'Unpublish' : 'Publish'}
          </button>
          <button onClick={() => save()} disabled={isPending} className="flex items-center gap-2 px-4 py-2 bg-[#558476] hover:bg-[#457366] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Post Title</label>
              <input type="text" value={form.title} onChange={(e) => set({ title: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Excerpt</label>
              <textarea value={form.excerpt} onChange={(e) => set({ excerpt: e.target.value })} rows={2}
                placeholder="A short summary shown in post listings..."
                maxLength={300}
                className={`${inputCls} resize-none`} />
              <p className="text-xs text-slate-400 mt-1.5">{form.excerpt.length}/300</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700">Content</label>
                <button type="button" onClick={() => setShowPreview((v) => !v)}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#558476] hover:underline">
                  <Code className="w-3.5 h-3.5" />
                  {showPreview ? 'Edit HTML' : 'Preview rendered HTML'}
                </button>
              </div>
              {showPreview ? (
                <div
                  className="prose prose-sm max-w-none w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm leading-relaxed min-h-[420px]"
                  dangerouslySetInnerHTML={{ __html: form.content || '<p class="text-slate-400">Nothing to preview yet.</p>' }}
                />
              ) : (
                <textarea value={form.content} onChange={(e) => set({ content: e.target.value })} rows={18}
                  placeholder="Write your article content here — plain text or HTML (<p>, <h2>, <strong>, <a>, <ul>...) both work."
                  className={`${inputCls} resize-none font-mono text-sm leading-relaxed`} />
              )}
              <p className="text-xs text-slate-400 mt-1.5">
                {form.content.split(/\s+/).filter(Boolean).length} words · {post.views.toLocaleString('en-IN')} views · HTML is rendered as-is on the storefront
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Post Settings</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
              <select value={form.status} onChange={(e) => set({ status: e.target.value as 'draft' | 'published' })} className={inputCls}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
              <select value={form.category} onChange={(e) => set({ category: e.target.value })} className={inputCls}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Author</label>
              <select value={form.author} onChange={(e) => set({ author: e.target.value })} className={inputCls}>
                {AUTHORS.map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Tags</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.tags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-[#558476]/10 text-[#558476] text-xs font-medium">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="p-0.5 hover:text-red-500"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                  placeholder="Add a tag…"
                  className={inputCls}
                />
                <button type="button" onClick={addTag} className="p-2.5 rounded-lg border border-slate-200 text-slate-500 hover:text-[#558476] hover:border-[#558476]/40">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Cover Image</h3>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleImageChange} />
            {form.image ? (
              <div className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.image} alt="" className="w-full aspect-video rounded-lg object-cover border border-slate-200" />
                <div className="absolute inset-0 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading}
                    className="px-3 py-1.5 rounded-lg bg-white text-xs font-medium text-slate-700 hover:text-[#558476]">
                    {isUploading ? 'Uploading…' : 'Replace'}
                  </button>
                  <button type="button" onClick={() => set({ image: '' })}
                    className="px-3 py-1.5 rounded-lg bg-white text-xs font-medium text-red-500">
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading}
                className="w-full aspect-video border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center gap-1.5 hover:border-[#558476]/40 transition-colors disabled:opacity-60">
                <ImagePlus className="w-6 h-6 text-slate-300" />
                <span className="text-xs text-slate-500 font-medium">{isUploading ? 'Uploading…' : 'Click to upload cover image'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
