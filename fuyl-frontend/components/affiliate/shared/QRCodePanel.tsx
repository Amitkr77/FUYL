'use client'

import { useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Download } from 'lucide-react'

interface QRCodePanelProps {
  url:        string
  size?:      number    // px — defaults to 180
  label?:     string    // caption below the QR code
}

export function QRCodePanel({ url, size = 180, label }: QRCodePanelProps) {
  const svgRef = useRef<HTMLDivElement>(null)

  const handleDownload = () => {
    const svg = svgRef.current?.querySelector('svg')
    if (!svg) return

    // Serialize SVG → Blob → object URL → anchor click
    const serializer = new XMLSerializer()
    const svgStr     = serializer.serializeToString(svg)
    const blob       = new Blob([svgStr], { type: 'image/svg+xml' })
    const objectUrl  = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href     = objectUrl
    a.download = 'affiliate-qr.svg'
    a.click()
    URL.revokeObjectURL(objectUrl)
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={svgRef}
        className="p-3 bg-white border border-brand-border rounded-xl inline-block"
      >
        <QRCodeSVG
          value={url || 'https://fuyl.in'}
          size={size}
          bgColor="#FFFFFF"
          fgColor="#12291F"   // brand-forest
          level="M"
        />
      </div>

      {label && (
        <p className="text-body-xs text-brand-muted text-center max-w-[200px] truncate">
          {label}
        </p>
      )}

      <button
        type="button"
        onClick={handleDownload}
        className="inline-flex items-center gap-2 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-brand-forest border border-brand-border rounded-lg hover:bg-brand-sage/50 transition-colors"
      >
        <Download size={13} />
        Download QR
      </button>
    </div>
  )
}
