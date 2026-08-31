import { getAdminPage, listPageRevisions } from '@/lib/content'
import { EditPageForm } from '@/components/content/EditPageForm'

export default async function EditContentPagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [page, revisions] = await Promise.all([getAdminPage(id), listPageRevisions(id).catch(() => [])])

  if (!page) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-2xl font-bold text-slate-900 mb-2">Page not found</p>
      </div>
    )
  }

  const storefrontUrl = (process.env.STOREFRONT_URL ?? 'https://fuyl.in').replace(/\/$/, '')
  return <EditPageForm page={page} storefrontUrl={storefrontUrl} revisions={revisions} />
}
