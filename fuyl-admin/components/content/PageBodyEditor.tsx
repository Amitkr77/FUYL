'use client'

import { useEffect, useRef, useState } from 'react'
import { Bold, Code2, Eye, Heading2, ImagePlus, Italic, Link2, List, ListOrdered, Quote, Redo2, Undo2 } from 'lucide-react'
import { uploadImage } from '@/lib/upload'
import { getContentImageUploadSignature } from '@/app/(admin)/content/actions'
import { SafeHtmlPreview } from './SafeHtmlPreview'

type Mode = 'visual' | 'html' | 'preview'
const buttonClass = 'rounded-md border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-[#558476] disabled:opacity-50'

export function PageBodyEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const savedSelection = useRef<Range | null>(null)
  const [mode, setMode] = useState<Mode>('visual')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (mode === 'visual' && editorRef.current && editorRef.current.innerHTML !== value && document.activeElement !== editorRef.current) editorRef.current.innerHTML = value
  }, [mode, value])

  const command = (name: string, argument?: string) => {
    editorRef.current?.focus()
    if (savedSelection.current) {
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(savedSelection.current)
      savedSelection.current = null
    }
    document.execCommand(name, false, argument)
    onChange(editorRef.current?.innerHTML ?? value)
  }
  const insertBlock = (html: string) => command('insertHTML', html)
  const insertLink = () => { const url = window.prompt('Enter the link URL'); if (url) command('createLink', url) }
  const upload = async (file: File) => {
    setUploading(true); setError('')
    const result = await uploadImage(file, getContentImageUploadSignature)
    setUploading(false)
    if ('error' in result) { setError(result.error); return }
    insertBlock(`<figure><img src="${result.url}" alt="" loading="lazy"><figcaption>Image caption</figcaption></figure><p><br></p>`)
  }

  return <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 p-2">
      <div className="flex flex-wrap gap-1">
        {mode === 'visual' && <>
          <button type="button" className={buttonClass} title="Undo" onMouseDown={(e) => { e.preventDefault(); command('undo') }}><Undo2 className="h-4 w-4" /></button><button type="button" className={buttonClass} title="Redo" onMouseDown={(e) => { e.preventDefault(); command('redo') }}><Redo2 className="h-4 w-4" /></button>
          <button type="button" className={buttonClass} title="Heading" onMouseDown={(e) => { e.preventDefault(); command('formatBlock', 'h2') }}><Heading2 className="h-4 w-4" /></button><button type="button" className={buttonClass} title="Bold" onMouseDown={(e) => { e.preventDefault(); command('bold') }}><Bold className="h-4 w-4" /></button><button type="button" className={buttonClass} title="Italic" onMouseDown={(e) => { e.preventDefault(); command('italic') }}><Italic className="h-4 w-4" /></button>
          <button type="button" className={buttonClass} title="Bulleted list" onMouseDown={(e) => { e.preventDefault(); command('insertUnorderedList') }}><List className="h-4 w-4" /></button><button type="button" className={buttonClass} title="Numbered list" onMouseDown={(e) => { e.preventDefault(); command('insertOrderedList') }}><ListOrdered className="h-4 w-4" /></button><button type="button" className={buttonClass} title="Quote" onMouseDown={(e) => { e.preventDefault(); command('formatBlock', 'blockquote') }}><Quote className="h-4 w-4" /></button><button type="button" className={buttonClass} title="Link" onMouseDown={(e) => { e.preventDefault(); insertLink() }}><Link2 className="h-4 w-4" /></button>
          <button type="button" disabled={uploading} className={buttonClass} title="Upload image" onMouseDown={(e) => { e.preventDefault(); const selection = window.getSelection(); if (selection?.rangeCount) savedSelection.current = selection.getRangeAt(0).cloneRange(); fileRef.current?.click() }}><ImagePlus className="h-4 w-4" /></button><input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void upload(file) }} />
        </>}
      </div>
      <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">{([{ id: 'visual', label: 'Visual', icon: null }, { id: 'html', label: 'HTML', icon: Code2 }, { id: 'preview', label: 'Preview', icon: Eye }] as const).map((item) => <button key={item.id} type="button" onClick={() => setMode(item.id)} className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium ${mode === item.id ? 'bg-[#558476] text-white' : 'text-slate-500'}`}>{item.icon && <item.icon className="h-3.5 w-3.5" />}{item.label}</button>)}</div>
    </div>
    {mode === 'visual' && <><div className="flex flex-wrap gap-2 border-b border-slate-100 px-3 py-2 text-xs"><span className="py-1 text-slate-400">Insert block:</span><button type="button" onClick={() => insertBlock('<div><h2>Section heading</h2><p>Add your section content here.</p></div><p><br></p>')} className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">Text section</button><button type="button" onClick={() => insertBlock('<blockquote><h3>Good to know</h3><p>Add an important note here.</p></blockquote><p><br></p>')} className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">Callout</button><button type="button" onClick={() => insertBlock('<p><a href="/collections/all"><strong>Shop now</strong></a></p><p><br></p>')} className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">CTA</button><button type="button" onClick={() => insertBlock('<h2>Frequently asked question</h2><p>Add the answer here.</p><p><br></p>')} className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">FAQ</button></div><div ref={editorRef} contentEditable suppressContentEditableWarning onInput={(e) => onChange(e.currentTarget.innerHTML)} className="prose prose-sm min-h-[420px] max-w-none p-4 outline-none" data-placeholder="Start writing your page…" /></>}
    {mode === 'html' && <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={20} className="min-h-[420px] w-full resize-y p-4 font-mono text-sm leading-relaxed outline-none" />}
    {mode === 'preview' && <div className="p-3"><SafeHtmlPreview html={value} /></div>}
    {(uploading || error) && <p className={`border-t px-3 py-2 text-xs ${error ? 'text-red-600' : 'text-slate-500'}`}>{error || 'Uploading image…'}</p>}
  </div>
}
