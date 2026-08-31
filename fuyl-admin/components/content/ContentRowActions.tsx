'use client'

import Link from 'next/link'
import { Copy, Edit2, ExternalLink, Link2, Trash2 } from 'lucide-react'
import { useState, useTransition } from 'react'

export function ContentRowActions({ editHref, deleteAction, duplicateAction, storefrontHref, label = 'item' }: { editHref: string; deleteAction: () => Promise<void>; duplicateAction?: () => Promise<void>; storefrontHref?: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const [pending, startTransition] = useTransition()
  return (
    <div className="flex items-center gap-1">
      {storefrontHref && <><a href={storefrontHref} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#558476]" title="Open storefront page"><ExternalLink className="h-4 w-4" /></a><button type="button" onClick={async () => { await navigator.clipboard.writeText(storefrontHref); setCopied(true); setTimeout(() => setCopied(false), 1500) }} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#558476]" title={copied ? 'Copied!' : 'Copy storefront URL'}><Link2 className="h-4 w-4" /></button></>}
      {duplicateAction && <button type="button" disabled={pending} onClick={() => startTransition(() => duplicateAction())} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#558476] disabled:opacity-40" title="Duplicate as draft"><Copy className="h-4 w-4" /></button>}
      <Link href={editHref} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-[#558476]/10 hover:text-[#558476]" title="Edit">
        <Edit2 className="h-4 w-4" />
      </Link>
      <form action={deleteAction} onSubmit={(event) => { if (!window.confirm(`Delete this ${label}? This action cannot be undone.`)) event.preventDefault() }}>
        <button type="submit" className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-[#B76E79]/10 hover:text-[#B76E79]" title="Delete">
          <Trash2 className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}
