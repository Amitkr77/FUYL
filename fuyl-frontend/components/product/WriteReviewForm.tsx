'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Star, Check, AlertCircle, ImagePlus, X } from 'lucide-react'
import { useAuthStore } from '@/lib/store/authStore'
import { createReview } from '@/lib/api/reviews'
import { getErrorMessage } from '@/lib/api/client'
import { getUploadSignature } from '@/lib/api/upload'
import { uploadImage } from '@/lib/utils/uploadImage'

const MAX_IMAGES = 5

interface WriteReviewFormProps {
  productId: string
  variantId?: string
  // Present only when opened from a delivered order line item — produces a
  // server-verified "Verified Purchase" review (see review.service.ts
  // verifyPurchase). Omitted on the PDP's general entry point, where there's
  // no specific order to attach.
  orderId?: string
  onCancel?: () => void
}

export function WriteReviewForm({ productId, variantId, orderId, onCancel }: WriteReviewFormProps) {
  const { token, user } = useAuthStore()
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')

  if (!user || !token) {
    return (
      <p className="text-body-sm text-brand-muted">
        <Link href="/account" className="text-brand-teal underline">Sign in</Link> to write a review.
      </p>
    )
  }

  if (status === 'done') {
    return (
      <div className="flex items-start gap-2 rounded-xl bg-brand-sage/40 p-4">
        <Check size={16} className="text-brand-forest shrink-0 mt-0.5" />
        <p className="text-body-sm text-brand-forest">
          Thanks for your review — it&apos;s awaiting approval and will appear here once published.
        </p>
      </div>
    )
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_IMAGES - images.length)
    e.target.value = ''
    if (!files.length) return
    setUploadError('')
    setIsUploading(true)
    for (const file of files) {
      try {
        const signature = await getUploadSignature(token, 'reviews')
        const url = await uploadImage(file, signature)
        setImages((prev) => [...prev, url])
      } catch (err) {
        setUploadError(getErrorMessage(err, 'Could not upload this photo.'))
      }
    }
    setIsUploading(false)
  }
  const removeImage = (index: number) => setImages((prev) => prev.filter((_, i) => i !== index))

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please choose a star rating.')
      setStatus('error')
      return
    }
    if (body.trim().length < 5) {
      setError('Please write a few words about your experience.')
      setStatus('error')
      return
    }
    setStatus('submitting')
    setError('')
    try {
      await createReview(token, {
        productId,
        variantId,
        orderId,
        rating,
        title: title.trim() || undefined,
        body: body.trim(),
        images: images.length ? images : undefined,
      })
      setStatus('done')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not submit your review. Please try again.'))
      setStatus('error')
    }
  }

  const displayRating = hoverRating || rating

  return (
    <div className="rounded-2xl border border-brand-border p-5">
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-label text-brand-muted mb-2">Your Rating</p>
          <div className="flex gap-1" onMouseLeave={() => setHoverRating(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHoverRating(n)}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                className="p-0.5"
              >
                <Star
                  size={22}
                  className={n <= displayRating ? 'fill-amber-400 text-amber-400' : 'text-brand-border'}
                />
              </button>
            ))}
          </div>
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          maxLength={200}
          className="h-10 px-3 text-body-sm border rounded-sm"
          style={{ borderColor: 'var(--color-brand-border)' }}
        />

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What did you like or dislike? How did it work for you?"
          rows={4}
          maxLength={5000}
          className="px-3 py-2.5 text-body-sm border rounded-sm resize-none"
          style={{ borderColor: 'var(--color-brand-border)' }}
        />

        <div>
          <p className="text-label text-brand-muted mb-2">Photos (optional)</p>
          <div className="flex flex-wrap gap-2">
            {images.map((url, i) => (
              <div key={url} className="relative w-16 h-16 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full rounded-sm object-cover border" style={{ borderColor: 'var(--color-brand-border)' }} />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
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
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-16 h-16 shrink-0 border-2 border-dashed rounded-sm flex flex-col items-center justify-center gap-1 hover:border-brand-teal/50 transition-colors disabled:opacity-60"
                style={{ borderColor: 'var(--color-brand-border)' }}
              >
                <ImagePlus size={16} className="text-brand-muted" />
                <span className="text-[10px] text-brand-muted">{isUploading ? '…' : 'Add'}</span>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          {uploadError && (
            <p className="flex items-center gap-1.5 text-body-xs mt-2" style={{ color: '#B91C1C' }}>
              <AlertCircle size={14} />
              {uploadError}
            </p>
          )}
        </div>

        {status === 'error' && error && (
          <p className="flex items-center gap-1.5 text-body-xs" style={{ color: '#B91C1C' }}>
            <AlertCircle size={14} />
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={status === 'submitting' || isUploading}
            className="h-11 px-6 text-xs font-semibold uppercase tracking-widest bg-brand-forest text-white rounded-sm transition-colors hover:bg-brand-olive disabled:opacity-60"
          >
            {status === 'submitting' ? 'Submitting…' : 'Submit Review'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="h-11 px-6 text-xs font-semibold uppercase tracking-widest text-brand-muted"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
