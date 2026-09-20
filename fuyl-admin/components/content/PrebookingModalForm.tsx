'use client'

import { useRef, useState, useTransition } from 'react'
import { CheckCircle2, AlertCircle, ImagePlus, X } from 'lucide-react'
import { updatePrebookingModalAction, getContentImageUploadSignature } from '@/app/(admin)/content/actions'
import { uploadImage } from '@/lib/upload'
import type { PrebookingModalSection } from '@/lib/content'
import { useContentDraftGuard } from './useContentDraftGuard'
import { Input, Checkbox, Toggle } from '@/components/ui/form'

interface Props { initial: PrebookingModalSection }

export function PrebookingModalForm({ initial }: Props) {
  const [data, setData] = useState(initial.data)
  const [isActive, setIsActive] = useState(initial.isActive)
  const [result, setResult] = useState<{ error?: string; ok?: true } | null>(null)
  const [pending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const qrFileRef = useRef<HTMLInputElement>(null)
  const { markSaved } = useContentDraftGuard({ isActive, data })

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
      if (!res.error) markSaved({ isActive, data })
    })
  }

  const set = <K extends keyof typeof data>(key: K, value: typeof data[K]) =>
    setData((d) => ({ ...d, [key]: value }))

  const SectionTitle = ({ children }: { children: string }) => (
    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pt-2">{children}</h3>
  )

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6">

      {/* Global active toggle */}
      <Toggle
        checked={isActive}
        onChange={setIsActive}
        label="Show pre-booking popup on storefront"
      />

      <div className={`space-y-5 ${!isActive ? 'opacity-50 pointer-events-none' : ''}`}>

        {/* -- Trigger / timing -- */}
        <SectionTitle>Trigger &amp; timing</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Floating button label" value={String(data.floatingButtonLabel)} placeholder="e.g. Pre-book now" onChange={(e) => set('floatingButtonLabel' as never, e.target.value as never)} />
          <Input label="Delay before popup (ms)" helperText="900 = 0.9 s after page load" type="number" min={0} value={data.delayMs} onChange={(e) => set('delayMs', Number(e.target.value))} />
          <Input label="Total capacity (spots)" type="number" min={1} value={data.capacity} onChange={(e) => set('capacity', Number(e.target.value))} />
        </div>

        {/* -- Form copy -- */}
        <SectionTitle>Form copy</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Badge (small label above headline)" value={String(data.badge)} placeholder="e.g. Launching soon" onChange={(e) => set('badge' as never, e.target.value as never)} />
          <Input label="Headline" value={String(data.headline)} placeholder="e.g. BE FIRST IN LINE" onChange={(e) => set('headline' as never, e.target.value as never)} />
        </div>
        <Input label="Description" value={String(data.description)} placeholder="e.g. Join the FUYL pre-booking list for early access\u2026" onChange={(e) => set('description' as never, e.target.value as never)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Submit button label" value={String(data.submitButtonLabel)} placeholder="e.g. Join pre-booking list" onChange={(e) => set('submitButtonLabel' as never, e.target.value as never)} />
          <Input label="Privacy note (below form)" value={String(data.privacyNote)} placeholder="e.g. We'll only use your details\u2026" onChange={(e) => set('privacyNote' as never, e.target.value as never)} />
        </div>

        {/* -- Donation section -- */}
        <SectionTitle>Donation section</SectionTitle>
        <Checkbox
          label="Show optional donation checkbox in the form"
          checked={data.showDonation}
          onChange={(e) => set('showDonation', e.target.checked)}
        />
        {data.showDonation && (
          <div className="pl-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Checkbox label" value={String(data.donationLabel)} placeholder="e.g. I would like to make an optional donation" onChange={(e) => set('donationLabel' as never, e.target.value as never)} />
              <Input label="Checkbox sub-label" value={String(data.donationSublabel)} placeholder="e.g. You can still join without donating." onChange={(e) => set('donationSublabel' as never, e.target.value as never)} />
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
                        {uploading ? 'Uploading\u2026' : 'Replace'}
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
                  {uploading ? 'Uploading\u2026' : 'Upload QR code image'}
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

        {/* -- Success screen -- */}
        <SectionTitle>Success screen (shown after form submitted)</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Success headline" value={String(data.successHeadline)} placeholder="e.g. YOU'RE ON THE LIST!" onChange={(e) => set('successHeadline' as never, e.target.value as never)} />
          <Input label="Success description" value={String(data.successDescription)} placeholder="e.g. We've emailed your confirmation\u2026" onChange={(e) => set('successDescription' as never, e.target.value as never)} />
          <Input label="WhatsApp button label" value={String(data.whatsappButtonLabel)} placeholder="e.g. Join our WhatsApp community" onChange={(e) => set('whatsappButtonLabel' as never, e.target.value as never)} />
          <Input label="Continue button label" value={String(data.continueShoppingLabel)} placeholder="e.g. Continue shopping" onChange={(e) => set('continueShoppingLabel' as never, e.target.value as never)} />
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
        {pending ? 'Saving\u2026' : 'Save changes'}
      </button>
    </div>
  )
}
