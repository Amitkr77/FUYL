'use client'

import { useRef, useState, useTransition } from 'react'
import { CheckCircle2, AlertCircle, ImagePlus, X } from 'lucide-react'
import { updatePrebookingModalAction, getContentImageUploadSignature } from '@/app/(admin)/content/actions'
import { uploadImage } from '@/lib/upload'
import type { PrebookingModalSection } from '@/lib/content'

interface Props { initial: PrebookingModalSection }

export function PrebookingModalForm({ initial }: Props) {
  const [data, setData] = useState(initial.data)
  const [isActive, setIsActive] = useState(initial.isActive)
  const [result, setResult] = useState<{ error?: string; ok?: true } | null>(null)
  const [pending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const qrFileRef = useRef<HTMLInputElement>(null)

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadError('')
    setUploading(true)
    const result = await uploadImage(file, getContentImageUploadSignature)
    setUploading(false)
    if ('error' in result) { setUploadError(result.error); return }
    set('donationQrUrl', result.url)
  }

  const save = () => {
    setResult(null)
    startTransition(async () => {
      const res = await updatePrebookingModalAction({ isActive, data })
      setResult(res.error ? { error: res.error } : { ok: true })
    })
  }

  const set = <K extends keyof typeof data>(key: K, value: typeof data[K]) =>
    setData((d) => ({ ...d, [key]: value }))

  const text = (label: string, key: keyof typeof data, placeholder?: string) => (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-700">{label}</span>
      <input
        type="text"
        value={String(data[key])}
        placeholder={placeholder}
        onChange={(e) => set(key as never, e.target.value as never)}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#558476] focus:ring-2 focus:ring-[#558476]/20"
      />
    </label>
  )

  const num = (label: string, key: 'delayMs' | 'capacity', min: number, hint?: string) => (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-700">{label}</span>
      {hint && <span className="mb-1 block text-xs text-slate-400">{hint}</span>}
      <input
        type="number"
        min={min}
        value={data[key]}
        onChange={(e) => set(key, Number(e.target.value))}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#558476] focus:ring-2 focus:ring-[#558476]/20"
      />
    </label>
  )

  const toggle = (label: string, key: 'showDonation', hint?: string) => (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={data[key]}
        onChange={(e) => set(key, e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[#558476] rounded"
      />
      <span>
        <span className="block text-sm text-slate-700">{label}</span>
        {hint && <span className="block text-xs text-slate-400 mt-0.5">{hint}</span>}
      </span>
    </label>
  )

  const SectionTitle = ({ children }: { children: string }) => (
    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pt-2">{children}</h3>
  )

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6">

      {/* Global active toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div className="relative">
          <input type="checkbox" className="sr-only peer" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          <div className="h-5 w-9 rounded-full bg-slate-200 peer-checked:bg-[#558476] transition-colors" />
          <div className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
        </div>
        <span className="text-sm font-medium text-slate-700">Show pre-booking popup on storefront</span>
      </label>

      <div className={`space-y-5 ${!isActive ? 'opacity-50 pointer-events-none' : ''}`}>

        {/* ── Trigger / timing ──────────────────────────── */}
        <SectionTitle>Trigger &amp; timing</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {text('Floating button label', 'floatingButtonLabel', 'e.g. Pre-book now')}
          {num('Delay before popup (ms)', 'delayMs', 0, '900 = 0.9 s after page load')}
          {num('Total capacity (spots)', 'capacity', 1)}
        </div>

        {/* ── Form copy ─────────────────────────────────── */}
        <SectionTitle>Form copy</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {text('Badge (small label above headline)', 'badge', 'e.g. Launching soon')}
          {text('Headline', 'headline', 'e.g. BE FIRST IN LINE')}
        </div>
        {text('Description', 'description', 'e.g. Join the FUYL pre-booking list for early access…')}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {text('Submit button label', 'submitButtonLabel', 'e.g. Join pre-booking list')}
          {text('Privacy note (below form)', 'privacyNote', "e.g. We'll only use your details…")}
        </div>

        {/* ── Donation section ──────────────────────────── */}
        <SectionTitle>Donation section</SectionTitle>
        {toggle('Show optional donation checkbox in the form', 'showDonation')}
        {data.showDonation && (
          <div className="pl-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {text('Checkbox label', 'donationLabel', 'e.g. I would like to make an optional donation')}
              {text('Checkbox sub-label', 'donationSublabel', 'e.g. You can still join without donating.')}
            </div>

            {/* QR image upload */}
            <div>
              <span className="mb-1 block text-xs font-semibold text-slate-700">Donation QR code image</span>
              <input ref={qrFileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleQrUpload} />
              {data.donationQrUrl ? (
                <div className="flex items-start gap-4">
                  <div className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={data.donationQrUrl} alt="Donation QR" className="h-32 w-32 rounded-lg border border-slate-200 object-contain bg-white" />
                    <div className="absolute inset-0 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
                      <button type="button" onClick={() => qrFileRef.current?.click()} disabled={uploading} className="px-2.5 py-1 rounded bg-white text-xs font-medium text-slate-700 hover:text-[#558476]">
                        {uploading ? 'Uploading…' : 'Replace'}
                      </button>
                      <button type="button" onClick={() => set('donationQrUrl', '')} className="px-2.5 py-1 rounded bg-white text-xs font-medium text-red-500">
                        Remove
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Hover the image to replace or remove it.</p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => qrFileRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500 hover:border-[#558476] hover:text-[#558476] transition-colors disabled:opacity-60"
                >
                  <ImagePlus className="h-4 w-4" />
                  {uploading ? 'Uploading…' : 'Upload QR code image'}
                </button>
              )}
              {uploadError && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
                  <X className="h-3 w-3" />{uploadError}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Success screen ────────────────────────────── */}
        <SectionTitle>Success screen (shown after form submitted)</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {text('Success headline', 'successHeadline', "e.g. YOU'RE ON THE LIST!")}
          {text('Success description', 'successDescription', "e.g. We've emailed your confirmation…")}
          {text('WhatsApp button label', 'whatsappButtonLabel', 'e.g. Join our WhatsApp community')}
          {text('"Continue" button label', 'continueShoppingLabel', 'e.g. Continue shopping')}
        </div>

      </div>

      {result?.error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{result.error}
        </div>
      )}
      {result?.ok && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />Saved successfully
        </div>
      )}

      <button
        onClick={save}
        disabled={pending}
        className="rounded-lg bg-[#558476] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#457366] disabled:opacity-60 transition-colors"
      >
        {pending ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  )
}
