import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { NavigationManager } from '@/components/content/NavigationManager'
import { listAdminPages } from '@/lib/content'

export default async function ContentNavigationPage() {
  const result = await listAdminPages({ page: 1, limit: 200, status: 'published', sort: 'navigation' })
  const storefrontUrl = (process.env.STOREFRONT_URL ?? 'https://fuyl.in').replace(/\/$/, '')

  return <div className="space-y-5">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Website Navigation</h1>
        <p className="mt-1 text-sm text-slate-500">Control how published custom pages appear in the storefront header and footer.</p>
      </div>
      <Link href="/content?tab=pages" className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" />Pages</Link>
    </div>
    <NavigationManager initialPages={result.items} storefrontUrl={storefrontUrl} />
  </div>
}
