'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { X } from 'lucide-react'
import type { PopupBannerCMS } from '@/lib/api/content'

const STORAGE_KEY = 'fuyl_popup_banner_dismissed'

interface Props {
  cms: PopupBannerCMS
}

export function PopupBanner({ cms }: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const { frequency, delayMs } = cms

    if (frequency === 'once_ever') {
      if (localStorage.getItem(STORAGE_KEY) === '1') return
    } else if (frequency === 'once_per_session') {
      if (sessionStorage.getItem(STORAGE_KEY) === '1') return
    }

    const timer = window.setTimeout(() => setOpen(true), delayMs)
    return () => window.clearTimeout(timer)
  }, [cms])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open])

  const close = () => {
    setOpen(false)
    if (cms.frequency === 'once_ever') {
      localStorage.setItem(STORAGE_KEY, '1')
    } else if (cms.frequency === 'once_per_session') {
      sessionStorage.setItem(STORAGE_KEY, '1')
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="popup-banner-title"
      onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}
    >
      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <X size={16} />
        </button>

        {cms.imageUrl && (
          <div className="relative h-48 w-full bg-slate-100">
            <Image src={cms.imageUrl} alt={cms.title} fill className="object-cover" />
          </div>
        )}

        <div className="p-6">
          <h2 id="popup-banner-title" className="font-display text-2xl text-brand-forest">{cms.title}</h2>
          {cms.body && <p className="mt-2 text-sm leading-6 text-brand-muted">{cms.body}</p>}

          {cms.ctaLabel && cms.ctaHref && (
            <Link
              href={cms.ctaHref}
              onClick={close}
              className="mt-5 block w-full rounded-lg bg-brand-forest px-5 py-3 text-center text-sm font-bold uppercase tracking-wider text-white hover:bg-brand-teal transition-colors"
            >
              {cms.ctaLabel}
            </Link>
          )}

          <button
            type="button"
            onClick={close}
            className="mt-3 block w-full text-center text-xs text-brand-muted underline underline-offset-4 hover:text-brand-forest"
          >
            No thanks
          </button>
        </div>
      </div>
    </div>
  )
}
