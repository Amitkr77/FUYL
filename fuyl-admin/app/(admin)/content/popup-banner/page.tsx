import { PopupBannerForm } from '@/components/content/PopupBannerForm'
import { getPopupBanner } from '@/lib/content'

export default async function Page() {
  const initial = await getPopupBanner()
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Popup Banner</h1>
        <p className="text-sm text-slate-500 mt-0.5">A generic promotional popup — add a title, body, optional image, and a CTA button.</p>
      </div>
      <PopupBannerForm initial={initial} />
    </div>
  )
}
