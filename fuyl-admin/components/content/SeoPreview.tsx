'use client'

export function SeoPreview({ title, description, slug }: { title: string; description: string; slug: string }) {
  const shownTitle = title.trim() || 'Untitled page'
  const shownDescription = description.trim() || 'Add an SEO description to explain what customers will find on this page.'
  const titleTone = title.length > 60 ? 'text-amber-600' : title.length >= 30 ? 'text-emerald-600' : 'text-slate-400'
  const descriptionTone = description.length > 160 ? 'text-amber-600' : description.length >= 100 ? 'text-emerald-600' : 'text-slate-400'
  return <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search result preview</p><div><p className="truncate text-xs text-emerald-700">fuyl.in › pages › {slug || 'page-url'}</p><p className="mt-1 truncate text-lg font-medium text-blue-700">{shownTitle} | FUYL</p><p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">{shownDescription}</p></div><div className="flex justify-between text-xs"><span className={titleTone}>Title: {title.length}/60</span><span className={descriptionTone}>Description: {description.length}/160</span></div></div>
}
