'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, CheckCircle2, Eye } from 'lucide-react'

const CATEGORIES = ['Nutrition Science', 'Ingredients', 'Industry Insights', 'Lifestyle', 'Research']
const AUTHORS = ['FUYL Team', 'Dr. Rima Khanna', 'Anjali Mehta', 'Vikram Rao']

export default function NewBlogPostPage() {
  const router = useRouter()
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    title: '',
    category: 'Nutrition Science',
    author: 'FUYL Team',
    status: 'draft' as 'draft' | 'published',
    content: '',
  })

  const slug = form.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60)

  const set = (k: Partial<typeof form>) => setForm((f) => ({ ...f, ...k }))

  const handleSave = (publish = false) => {
    if (publish) set({ status: 'published' })
    setSaved(true)
    setTimeout(() => { setSaved(false); router.push('/blog') }, 2000)
  }

  const inputCls = 'w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/blog" className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-slate-900">New Blog Post</h2>
            <p className="text-sm text-slate-500">Draft saved automatically</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleSave(false)} className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
            <Save className="w-4 h-4" />
            Save Draft
          </button>
          <button
            onClick={() => handleSave(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#558476] hover:bg-[#457366] text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saved ? <CheckCircle2 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {saved ? 'Published!' : 'Publish'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main editor */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Post Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => set({ title: e.target.value })}
                placeholder="Enter a compelling title..."
                className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent"
              />
              {slug && (
                <p className="text-xs text-slate-400 mt-1.5">
                  Slug: <span className="font-mono text-slate-600">/blog/{slug}</span>
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Content</label>
              <textarea
                value={form.content}
                onChange={(e) => set({ content: e.target.value })}
                rows={18}
                placeholder={`Start writing your article...\n\nTip: Use clear headings, short paragraphs, and back claims with research.`}
                className={`${inputCls} resize-none font-mono text-sm leading-relaxed`}
              />
              <p className="text-xs text-slate-400 mt-1.5">
                {form.content.split(/\s+/).filter(Boolean).length} words
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar */}
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
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">SEO Preview</h3>
            <div className="border border-slate-100 rounded-lg p-3 bg-slate-50">
              <p className="text-xs text-slate-400 mb-1">fuyl.in/blog/{slug || 'your-post-title'}</p>
              <p className="text-sm font-semibold text-blue-700 leading-snug">
                {form.title || 'Your Post Title'}
              </p>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                {form.content.slice(0, 120) || 'Post description will appear here...'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
