'use client'

import dynamic from 'next/dynamic'
import type { PopupBannerCMS, PrebookingModalCMS } from '@/lib/api/content'

const PrebookingPopup = dynamic(
  () => import('./PrebookingPopup').then((module) => module.PrebookingPopup),
  { ssr: false },
)

const PopupBanner = dynamic(
  () => import('./PopupBanner').then((module) => module.PopupBanner),
  { ssr: false },
)

interface Props {
  prebookingModal?: PrebookingModalCMS | null
  popupBanner?: PopupBannerCMS | null
}

export function DeferredMarketing({ prebookingModal, popupBanner }: Props) {
  return (
    <>
      <PrebookingPopup cms={prebookingModal} />
      {popupBanner ? <PopupBanner cms={popupBanner} /> : null}
    </>
  )
}
