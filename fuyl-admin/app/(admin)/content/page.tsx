import { Globe, Pencil, Calendar } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { MOCK_CONTENT_PAGES } from '@/lib/mock-data'
import type { ContentPage } from '@/lib/mock-data'
import { formatDate } from '@/lib/utils'

export default function ContentPage() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Website Content</h2>
        <p className="text-sm text-slate-500 mt-0.5">Manage your frontend pages</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-900">{MOCK_CONTENT_PAGES.length}</p>
          <p className="text-sm text-slate-500 mt-0.5">Total Pages</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-bold text-emerald-600">
            {MOCK_CONTENT_PAGES.filter((p: ContentPage) => p.status === 'published').length}
          </p>
          <p className="text-sm text-slate-500 mt-0.5">Published</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-bold text-amber-600">
            {MOCK_CONTENT_PAGES.filter((p: ContentPage) => p.status === 'draft').length}
          </p>
          <p className="text-sm text-slate-500 mt-0.5">Drafts</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-900">6</p>
          <p className="text-sm text-slate-500 mt-0.5">Last 30 days</p>
        </div>
      </div>

      {/* Pages Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MOCK_CONTENT_PAGES.map((page: ContentPage) => (
          <div
            key={page.id}
            className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 bg-brand-teal/10 rounded-lg flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5 text-brand-teal" />
              </div>
              <Badge variant={page.status === 'published' ? 'success' : 'default'}>
                {page.status === 'published' ? 'Published' : 'Draft'}
              </Badge>
            </div>

            <div className="flex-1">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">{page.name}</h3>
              <p className="text-xs text-slate-400 font-mono mb-3">{page.slug}</p>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
                <span>Last edited {formatDate(page.lastEdited)}</span>
              </div>
            </div>

            <button
              className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 hover:bg-brand-teal/10 text-slate-700 hover:text-brand-teal text-sm font-medium rounded-lg border border-slate-200 hover:border-brand-teal/20 transition-all"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Content
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
