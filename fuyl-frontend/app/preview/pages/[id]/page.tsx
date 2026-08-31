import { notFound } from 'next/navigation'
import { Eye } from 'lucide-react'
import { getPagePreview } from '@/lib/api/content'
import { sanitizeHtml } from '@/lib/utils/sanitizeHtml'

export const metadata = { title: 'Page preview | FUYL', robots: 'noindex, nofollow' }

function renderableBody(body: string): string {
  if (/<\/?[a-z][\s\S]*>/i.test(body)) return body
  const escaped = body.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
  return escaped.split(/\n{2,}/).map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`).join('')
}

export default async function DraftPagePreview({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ token?: string }> }) {
  const [{ id }, { token }] = await Promise.all([params, searchParams])
  if (!token) notFound()
  let page
  try { page = await getPagePreview(id, token) } catch { notFound() }
  return <><div className="sticky top-16 z-30 flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-xs font-semibold text-amber-900"><Eye className="h-4 w-4" />Draft preview · This private link expires in 10 minutes</div><main className="mx-auto max-w-3xl px-4 py-12 sm:py-16"><h1 className="mb-8 text-3xl font-bold text-brand-forest">{page.title}</h1><div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderableBody(page.body)) }} /></main></>
}
