'use client'

import { useState, useTransition } from 'react'
import { History, RotateCcw } from 'lucide-react'
import type { StorefrontSectionRevision } from '@/lib/content'
import { restoreStorefrontSectionRevisionAction } from '@/app/(admin)/content/actions'

export function SectionRevisionHistory({ sectionKey, revisions }: { sectionKey:string; revisions:StorefrontSectionRevision[] }) {
  const [open,setOpen]=useState(false)
  const [pending,startTransition]=useTransition()
  const [error,setError]=useState('')
  const restore=(revision:StorefrontSectionRevision)=>{
    if(!window.confirm(`Restore the version saved on ${new Date(revision.savedAt).toLocaleString()}? The current version will remain recoverable.`))return
    startTransition(async()=>{setError('');const result=await restoreStorefrontSectionRevisionAction(sectionKey,revision.revisionId);if(result.error){setError(result.error);return}window.location.reload()})
  }
  return <div className="rounded-xl border border-slate-200 bg-white shadow-sm"><button type="button" onClick={()=>setOpen((value)=>!value)} className="flex w-full items-center justify-between p-5 text-left"><span className="flex items-center gap-2 text-sm font-semibold text-slate-900"><History className="h-4 w-4"/>Version history <span className="font-normal text-slate-400">({revisions.length})</span></span><span className="text-xs font-medium text-[#558476]">{open?'Hide':'View'}</span></button>{open&&<div className="border-t border-slate-100 p-4">{error&&<p className="mb-2 text-xs text-red-600">{error}</p>}{revisions.length?<ol className="max-h-64 space-y-2 overflow-y-auto">{revisions.map((revision)=><li key={revision.revisionId} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3"><div><p className="text-xs font-medium text-slate-700">{new Date(revision.savedAt).toLocaleString()}</p><p className="mt-0.5 text-[11px] text-slate-400">{revision.isActive?'Visible':'Hidden'}</p></div><button type="button" disabled={pending} onClick={()=>restore(revision)} className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-50"><RotateCcw className="h-3.5 w-3.5"/>Restore</button></li>)}</ol>:<p className="py-3 text-center text-xs text-slate-400">History starts after the next save.</p>}<p className="mt-3 text-[11px] text-slate-400">The latest 20 versions are retained.</p></div>}</div>
}
