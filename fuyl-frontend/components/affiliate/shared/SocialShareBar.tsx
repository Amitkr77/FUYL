'use client'

import { cn } from '@/lib/utils/cn'

// ─── Platform configs ─────────────────────────────────────────────────────────

interface Platform {
  key:   string
  label: string
  color: string
  buildUrl: (url: string, text: string) => string
  /** Inline SVG path — keeping this zero-dependency (no icon lib needed for 4 logos) */
  icon:  React.ReactNode
}

const PLATFORMS: Platform[] = [
  {
    key:   'facebook',
    label: 'Facebook',
    color: 'hover:bg-[#1877F2]/10 hover:text-[#1877F2] hover:border-[#1877F2]/30',
    buildUrl: (url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width={16} height={16}>
        <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
      </svg>
    ),
  },
  {
    key:   'twitter',
    label: 'X (Twitter)',
    color: 'hover:bg-black/5 hover:text-black hover:border-black/20',
    buildUrl: (url, text) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width={15} height={15}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    key:   'linkedin',
    label: 'LinkedIn',
    color: 'hover:bg-[#0A66C2]/10 hover:text-[#0A66C2] hover:border-[#0A66C2]/30',
    buildUrl: (url) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width={16} height={16}>
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
  {
    key:   'pinterest',
    label: 'Pinterest',
    color: 'hover:bg-[#E60023]/10 hover:text-[#E60023] hover:border-[#E60023]/30',
    buildUrl: (url, text) =>
      `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(text)}`,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width={16} height={16}>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
      </svg>
    ),
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

interface SocialShareBarProps {
  url:        string
  text?:      string    // share text / caption
  className?: string
  layout?:    'row' | 'grid'   // row = inline buttons, grid = 2×2 on mobile
}

export function SocialShareBar({
  url,
  text = 'Check out FUYL — use my link to get started!',
  className,
  layout = 'row',
}: SocialShareBarProps) {
  const open = (shareUrl: string) => {
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=480')
  }

  return (
    <div
      className={cn(
        layout === 'grid'
          ? 'grid grid-cols-2 gap-2'
          : 'flex flex-wrap gap-2',
        className,
      )}
    >
      {PLATFORMS.map((platform) => (
        <button
          key={platform.key}
          type="button"
          onClick={() => open(platform.buildUrl(url, text))}
          title={`Share on ${platform.label}`}
          className={cn(
            'inline-flex items-center gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider',
            'border border-brand-border rounded-lg text-brand-muted transition-all',
            platform.color,
            layout === 'grid' && 'justify-center',
          )}
        >
          {platform.icon}
          <span>{platform.label}</span>
        </button>
      ))}
    </div>
  )
}
