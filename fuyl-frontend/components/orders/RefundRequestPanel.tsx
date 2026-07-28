'use client'

import { useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { requestRefund } from '@/lib/api/account'
import { getUploadSignature } from '@/lib/api/upload'
import { uploadImage } from '@/lib/utils/uploadImage'
import { getErrorMessage } from '@/lib/api/client'
import type { OrderLineItem } from '@/types/user'

const MAX_IMAGES = 5

// Seal-damaged refund request. The backend accepts refunds ONLY for
// seal-damaged products and requires at least one photo per item — this form
// forces the damaged condition and requires a photo before it will submit.
export function RefundRequestPanel({
  token,
  orderId,
  items,
  onDone,
}: {
  token: string
  orderId: string
  items: OrderLineItem[]
  onDone: () => void
}) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [reason, setReason] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [isUploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const toggle = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }))

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_IMAGES - images.length)
    e.target.value = ''
    if (!files.length) return
    setUploadError('')
    setUploading(true)
    for (const file of files) {
      try {
        const sig = await getUploadSignature(token, 'returns')
        const url = await uploadImage(file, sig)
        setImages((prev) => [...prev, url])
      } catch (err) {
        setUploadError(getErrorMessage(err, 'Could not upload this photo.'))
      }
    }
    setUploading(false)
  }

  const submit = async () => {
    const chosen = items.filter((i) => selected[i.id])
    if (!chosen.length) { setError('Select at least one item to refund.'); return }
    if (reason.trim().length < 3) { setError('Please describe the seal damage.'); return }
    if (!images.length) { setError('Please attach at least one photo of the damaged seal.'); return }
    setSubmitting(true)
    setError('')
    try {
      await requestRefund(token, {
        orderId,
        items: chosen.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
          reason: reason.trim(),
          images,
        })),
      })
      setDone(true)
      onDone()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not submit your refund request. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-brand-border p-5">
        <p className="text-body-sm text-brand-forest">
          Refund request submitted — our team will review the seal-damage photos and get back to you.
        </p>
      </div>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-body-sm font-semibold text-brand-teal hover:underline"
      >
        Received a seal-damaged product? Request a refund
      </button>
    )
  }

  return (
    <div className="rounded-2xl border border-brand-border p-5">
      <p className="text-label text-brand-muted mb-1">Request a refund</p>
      <p className="text-body-sm text-brand-muted mb-4">
        Refunds are available only for products that arrived with a damaged seal. Select the affected item(s), describe the damage, and attach a photo of the damaged seal.
      </p>

      {/* Items */}
      <div className="flex flex-col gap-2 mb-4">
        {items.map((i) => (
          <label key={i.id} className="flex items-center gap-3 text-body-sm cursor-pointer">
            <input type="checkbox" checked={!!selected[i.id]} onChange={() => toggle(i.id)} />
            <span className="text-brand-forest">{i.name}</span>
            <span className="text-brand-muted">× {i.quantity}</span>
          </label>
        ))}
      </div>

      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        maxLength={500}
        placeholder="Describe the seal damage"
        className="w-full px-3 py-2.5 text-body-sm border rounded-sm resize-none mb-4"
        style={{ borderColor: 'var(--color-brand-border)' }}
      />

      {/* Photos — required proof */}
      <p className="text-label text-brand-muted mb-2">Photo of the damaged seal (required)</p>
      <div className="flex flex-wrap gap-2 mb-1">
        {images.map((url, i) => (
          <div key={url} className="relative w-16 h-16 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-full rounded-sm object-cover border" style={{ borderColor: 'var(--color-brand-border)' }} />
            <button
              type="button"
              onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
              className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-white border text-brand-muted hover:text-red-500"
              style={{ borderColor: 'var(--color-brand-border)' }}
              aria-label="Remove photo"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        {images.length < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={isUploading}
            className="w-16 h-16 shrink-0 border-2 border-dashed rounded-sm flex flex-col items-center justify-center gap-1 hover:border-brand-teal/50 transition-colors disabled:opacity-60"
            style={{ borderColor: 'var(--color-brand-border)' }}
          >
            <ImagePlus size={16} className="text-brand-muted" />
            <span className="text-[10px] text-brand-muted">{isUploading ? '…' : 'Add'}</span>
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handleFiles} />
      {uploadError && <p className="text-body-xs text-red-600 mt-1">{uploadError}</p>}

      {error && <p className="text-body-xs text-red-600 mt-3">{error}</p>}
      <div className="flex gap-3 mt-4">
        <button
          type="button"
          onClick={submit}
          disabled={submitting || isUploading}
          className="inline-flex items-center justify-center h-10 px-5 text-xs font-semibold uppercase tracking-widest bg-brand-forest text-white rounded-sm transition-colors hover:bg-brand-sage hover:text-brand-forest disabled:opacity-60"
        >
          {submitting ? 'Submitting…' : 'Submit refund request'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError('') }}
          disabled={submitting}
          className="inline-flex items-center justify-center h-10 px-5 text-xs font-semibold uppercase tracking-widest border rounded-sm transition-colors hover:bg-brand-sage/40 disabled:opacity-60"
          style={{ borderColor: 'var(--color-brand-border)' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
