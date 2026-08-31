import Link from 'next/link'
import { AlertCircle, AlertTriangle, ArrowRight, CheckCircle2, ExternalLink, FileText, Link2, SearchCheck } from 'lucide-react'
import { getPageQualityAudit, type PageQualityAudit } from '@/lib/content'
import { getErrorMessage } from '@/lib/api'

const TYPE_LABELS: Record<string, string> = {
  missing_seo_title: 'SEO title',
  long_seo_title: 'SEO title',
  missing_seo_description: 'SEO description',
  seo_description_length: 'SEO description',
  thin_content: 'Page content',
  unlinked_page: 'Navigation',
  missing_image_alt: 'Accessibility',
  broken_page_link: 'Broken link',
}

export default async function ContentQualityPage() {
  let audit: PageQualityAudit | null = null
  let error = ''
  try { audit = await getPageQualityAudit() } catch (err) { error = getErrorMessage(err, 'Could not run the content quality check.') }

  if (!audit) return <div className="rounded-xl border border-red-100 bg-red-50 p-5 text-sm text-red-700"><p className="flex items-center gap-2 font-medium"><AlertCircle className="h-4 w-4" />Content check unavailable</p><p className="mt-1">{error}</p></div>

  const grouped = new Map<string, typeof audit.issues>()
  for (const issue of audit.issues) grouped.set(issue.pageId, [...(grouped.get(issue.pageId) ?? []), issue])
  const scoreTone = audit.summary.score >= 90 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : audit.summary.score >= 70 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-red-700 bg-red-50 border-red-200'

  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-xl font-bold text-slate-900">Content Quality</h1><p className="mt-1 text-sm text-slate-500">Find storefront page problems before customers or search engines encounter them.</p></div>
      <Link href="/content?tab=pages" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Back to pages</Link>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <Stat label="Quality score" value={`${audit.summary.score}%`} icon={SearchCheck} className={scoreTone} />
      <Stat label="Pages checked" value={audit.summary.totalPages} icon={FileText} />
      <Stat label="Affected pages" value={audit.summary.affectedPages} icon={AlertTriangle} />
      <Stat label="Broken links" value={audit.summary.errorCount} icon={Link2} className={audit.summary.errorCount ? 'border-red-200 bg-red-50 text-red-700' : ''} />
      <Stat label="Warnings" value={audit.summary.warningCount} icon={AlertCircle} />
    </div>

    {!audit.issues.length ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-10 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" /><h2 className="mt-3 font-semibold text-emerald-900">All page checks passed</h2><p className="mt-1 text-sm text-emerald-700">No SEO, content, accessibility, navigation, or CMS link issues were found.</p></div> :
      <div className="space-y-3">{Array.from(grouped.entries()).map(([pageId, issues]) => <section key={pageId} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div><h2 className="font-semibold text-slate-900">{issues[0].title}</h2><p className="mt-0.5 text-xs text-slate-400">/pages/{issues[0].slug} · {issues.length} issue{issues.length === 1 ? '' : 's'}</p></div>
          <div className="flex items-center gap-2"><a href={`https://fuyl.in/pages/${issues[0].slug}`} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:text-[#558476]" title="Open storefront page"><ExternalLink className="h-4 w-4" /></a><Link href={`/content/pages/${pageId}`} className="flex items-center gap-2 rounded-lg bg-[#558476] px-3 py-2 text-sm font-medium text-white hover:bg-[#457366]">Fix page <ArrowRight className="h-4 w-4" /></Link></div>
        </div>
        <ul className="divide-y divide-slate-100">{issues.map((issue, index) => <li key={`${issue.type}-${index}`} className="flex gap-3 px-5 py-3">
          {issue.severity === 'error' ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />}
          <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{TYPE_LABELS[issue.type] ?? issue.type.replace(/_/g, ' ')}</p><p className="mt-0.5 text-sm text-slate-700">{issue.message}</p></div>
        </li>)}</ul>
      </section>)}</div>}
    <p className="text-right text-xs text-slate-400">Checked {new Date(audit.checkedAt).toLocaleString()}</p>
  </div>
}

function Stat({ label, value, icon: Icon, className = '' }: { label: string; value: string | number; icon: typeof SearchCheck; className?: string }) {
  return <div className={`rounded-xl border border-slate-200 bg-white p-4 ${className}`}><div className="flex items-center justify-between"><p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p><Icon className="h-4 w-4 opacity-60" /></div><p className="mt-2 text-2xl font-bold">{value}</p></div>
}
