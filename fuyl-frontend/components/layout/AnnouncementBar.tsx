'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { ANNOUNCEMENT, ANNOUNCEMENT_LINK } from '@/lib/constants/site'

export function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="relative bg-brand-forest text-white text-center py-2.5 px-10">
      <Link
        href={ANNOUNCEMENT_LINK}
        className="text-body-xs font-semibold tracking-widest uppercase hover:text-brand-sage transition-colors"
      >
        {ANNOUNCEMENT}
        <span className="ml-1" aria-hidden="true">→</span>
      </Link>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss announcement"
        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:opacity-70 transition-opacity"
      >
        <X size={14} />
      </button>
    </div>
  )
}
