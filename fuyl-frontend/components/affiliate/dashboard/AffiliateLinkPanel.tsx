'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Link as LinkIcon, Tag } from 'lucide-react'
import { CopyButton }    from '@/components/affiliate/shared/CopyButton'
import { QRCodePanel }   from '@/components/affiliate/shared/QRCodePanel'
import { SocialShareBar } from '@/components/affiliate/shared/SocialShareBar'
import type { AffiliateLink } from '@/lib/api/affiliate'

interface AffiliateLinkPanelProps {
  links: AffiliateLink[]
}

export function AffiliateLinkPanel({ links }: AffiliateLinkPanelProps) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [showQR, setShowQR]           = useState(false)

  const primary = links[selectedIdx] ?? links[0]

  if (!primary) {
    return (
      <div className="bg-white border border-brand-border rounded-xl p-6 text-center">
        <p className="text-brand-muted text-body-sm">
          No tracking links yet — they are created automatically when your account is approved.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-brand-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border/60">
        <div className="flex items-center gap-2 text-brand-forest">
          <LinkIcon size={15} />
          <span className="text-[11px] font-bold uppercase tracking-wider">Affiliate Link</span>
        </div>
        <Link
          href="/affiliate/dashboard/marketing"
          className="text-body-xs text-brand-teal font-semibold hover:underline"
        >
          More options →
        </Link>
      </div>

      <div className="p-5 space-y-4">
        {/* Link selector (if multiple links) */}
        {links.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {links.map((l, i) => (
              <button
                key={l._id}
                type="button"
                onClick={() => setSelectedIdx(i)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-body-xs font-semibold border transition-colors ${
                  i === selectedIdx
                    ? 'bg-brand-forest text-white border-brand-forest'
                    : 'border-brand-border text-brand-muted hover:border-brand-forest hover:text-brand-forest'
                }`}
              >
                <Tag size={10} />
                {l.label ?? `Link ${i + 1}`}
              </button>
            ))}
          </div>
        )}

        {/* URL display + copy */}
        <div className="flex items-center gap-2 bg-brand-cream/60 border border-brand-border rounded-xl px-4 py-3">
          <p className="flex-1 text-body-xs font-mono text-brand-forest truncate min-w-0">
            {primary.trackingUrl}
          </p>
          <CopyButton text={primary.trackingUrl} size="sm" />
          <a
            href={primary.trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-brand-muted hover:text-brand-forest hover:bg-brand-sage/40 transition-colors"
            aria-label="Open link"
          >
            <ExternalLink size={14} />
          </a>
        </div>

        {/* Share + QR toggle */}
        <div className="flex flex-wrap gap-2 items-center">
          <SocialShareBar url={primary.trackingUrl} />
          <button
            type="button"
            onClick={() => setShowQR((v) => !v)}
            className="inline-flex items-center gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider border border-brand-border rounded-lg text-brand-muted hover:bg-brand-sage/50 hover:text-brand-forest transition-colors"
          >
            {showQR ? 'Hide QR' : 'QR Code'}
          </button>
        </div>

        {/* QR panel */}
        {showQR && (
          <div className="flex justify-center pt-2 border-t border-brand-border/40">
            <QRCodePanel url={primary.trackingUrl} label={primary.label ?? primary.code} />
          </div>
        )}
      </div>
    </div>
  )
}
