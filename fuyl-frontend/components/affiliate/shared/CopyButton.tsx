'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface CopyButtonProps {
  text:       string
  size?:      'sm' | 'md'
  className?: string
  label?:     string   // optional visible label e.g. "Copy link"
}

export function CopyButton({ text, size = 'sm', className, label }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable — silently ignore
    }
  }

  const iconSize = size === 'sm' ? 14 : 16

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
      className={cn(
        'inline-flex items-center gap-1.5 transition-colors',
        size === 'sm'
          ? 'p-1.5 rounded-lg text-brand-muted hover:text-brand-forest hover:bg-brand-sage/50'
          : 'px-3 py-2 rounded-lg text-body-xs font-medium text-brand-muted hover:text-brand-forest hover:bg-brand-sage/50',
        copied && 'text-brand-teal! hover:text-brand-teal!',
        className,
      )}
    >
      {copied
        ? <Check size={iconSize} className="text-brand-teal" />
        : <Copy size={iconSize} />}
      {label && (
        <span>{copied ? 'Copied!' : label}</span>
      )}
    </button>
  )
}
