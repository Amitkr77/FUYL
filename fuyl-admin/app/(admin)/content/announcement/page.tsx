import { AnnouncementBarForm } from '@/components/content/AnnouncementBarForm'
import { getAnnouncementBar } from '@/lib/content'

export default async function Page() {
  const initial = await getAnnouncementBar()
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Announcement Bar</h1>
        <p className="text-sm text-slate-500 mt-0.5">The slim banner shown at the very top of every storefront page.</p>
      </div>
      <AnnouncementBarForm initial={initial} />
    </div>
  )
}
