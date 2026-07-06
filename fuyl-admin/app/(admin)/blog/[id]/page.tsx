'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, CheckCircle2, Eye, Trash2 } from 'lucide-react'
import { getBlogPostById } from '@/lib/mock-data'

const CATEGORIES = ['Nutrition Science', 'Ingredients', 'Industry Insights', 'Lifestyle', 'Research']
const AUTHORS = ['FUYL Team', 'Dr. Rima Khanna', 'Anjali Mehta', 'Vikram Rao']

const SAMPLE_CONTENT: Record<string, string> = {
  b1: `Magnesium is one of the most critical minerals in the human body, involved in over 300 enzymatic reactions. Yet the form of magnesium matters enormously.

## The Problem with Magnesium Oxide

Magnesium oxide is the most commonly used form in budget supplements — primarily because it contains the highest percentage of elemental magnesium by weight (~60%). However, bioavailability is catastrophically low: studies show only 4% absorption in healthy subjects.

## Why Glycinate is Different

Magnesium glycinate is chelated to glycine, an amino acid that acts as a carrier molecule. This chelation:
- Bypasses the intestinal transport pathway that limits oxide absorption
- Achieves ~80% bioavailability in clinical studies
- Does not cause the gastrointestinal distress common with oxide

## Clinical Evidence

A 2015 double-blind RCT published in Magnesium Research found that glycinate forms raised serum magnesium levels 2.4× faster than oxide at equivalent doses.

## What This Means for You

If your supplement uses magnesium oxide, you are absorbing a fraction of the labelled dose. FUYL COMPLETE+ uses magnesium glycinate — clinically dosed at 300mg elemental magnesium per sachet.`,
  b2: `The supplement industry has a transparency problem. Proprietary blends are one of its most deceptive practices.

## What Is a Proprietary Blend?

A proprietary blend is a group of ingredients listed together with a combined weight, but without individual ingredient quantities. Manufacturers claim this protects their "formula" — in reality, it often hides sub-therapeutic dosing.

## The Numbers Don't Lie

If a blend contains 10 ingredients totalling 500mg, theoretically any ingredient could be dosed at just 0.01mg — far below any clinically meaningful dose. Yet the label looks impressive.

## FUYL's Position

Every ingredient in FUYL COMPLETE+ is listed with its exact dose. We believe you deserve to know exactly what you're putting into your body and at what amount.`,
}

export default function EditBlogPostPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const post = getBlogPostById(id)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    title: post?.title ?? '',
    category: post?.category ?? 'Nutrition Science',
    author: post?.author ?? 'FUYL Team',
    status: (post?.status ?? 'draft') as 'draft' | 'published',
    content: SAMPLE_CONTENT[id] ?? '',
  })

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-2xl font-bold text-slate-900 mb-2">Post not found</p>
        <Link href="/blog" className="text-sm text-[#558476] hover:underline">← Back to Blog</Link>
      </div>
    )
  }

  const set = (k: Partial<typeof form>) => setForm((f) => ({ ...f, ...k }))
  const handleSave = () => {
    setSaved(true)
    setTimeout(() => { setSaved(false) }, 2000)
  }

  const inputCls = 'w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent'

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
          <button onClick={() => router.push('/blog')} className="flex items-center gap-2 px-4 py-2 border border-red-200 bg-white text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors">
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          <button onClick={() => { set({ status: 'published' }); handleSave() }} className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
            <Eye className="w-4 h-4" />
            {form.status === 'published' ? 'Unpublish' : 'Publish'}
          </button>
          <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-[#558476] hover:bg-[#457366] text-white text-sm font-medium rounded-lg transition-colors">
            {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Post Title</label>
              <input type="text" value={form.title} onChange={(e) => set({ title: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Content</label>
              <textarea value={form.content} onChange={(e) => set({ content: e.target.value })} rows={18}
                placeholder="Write your article content here..."
                className={`${inputCls} resize-none font-mono text-sm leading-relaxed`} />
              <p className="text-xs text-slate-400 mt-1.5">{form.content.split(/\s+/).filter(Boolean).length} words · {post.views.toLocaleString('en-IN')} views</p>
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
          </div>
        </div>
      </div>
    </div>
  )
}
