'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { WriteReviewForm } from './WriteReviewForm'

interface Review {
  id:        string
  author:    string
  rating:    number
  date:      string
  body:      string
  verified?: boolean
}

interface ReviewsWidgetProps {
  productId:    string
  reviews:      Review[]
  averageRating: number
  totalCount:   number
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((n) => (
        <Star
          key={n}
          size={13}
          className={n <= rating ? 'fill-amber-400 text-amber-400' : 'text-[#E8E0D8]'}
        />
      ))}
    </div>
  )
}

export function ReviewsWidget({ productId, reviews, averageRating, totalCount }: ReviewsWidgetProps) {
  const [showForm, setShowForm] = useState(false)

  return (
    <section className="mt-12 border-t pt-10" style={{ borderColor: 'var(--color-brand-border)' }}>
      {/* Header */}
      <div className="flex flex-col gap-3 mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-display-md font-display">WHAT THEY&apos;RE SAYING</h2>
          <div className="flex items-center gap-3 mt-2">
            <Stars rating={Math.round(averageRating)} />
            <span className="text-body-sm font-semibold">{averageRating.toFixed(1)} out of 5</span>
            <span className="text-body-xs" style={{ color: 'var(--color-brand-muted)' }}>({totalCount} reviews)</span>
          </div>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="h-11 px-6 text-xs font-semibold uppercase tracking-widest border border-brand-forest text-brand-forest rounded-sm transition-colors hover:bg-brand-forest hover:text-white shrink-0"
          >
            Write a Review
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-8">
          <WriteReviewForm productId={productId} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {/* Review cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((r) => (
          <article key={r.id} className="p-5 rounded-sm border" style={{ borderColor: 'var(--color-brand-border)' }}>
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <p className="text-body-sm font-semibold">{r.author}</p>
                <p className="text-body-xs mt-0.5" style={{ color: 'var(--color-brand-muted)' }}>{r.date}</p>
              </div>
              {r.verified && (
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm" style={{ background: 'var(--color-brand-cream)', color: 'var(--color-brand-muted)' }}>
                  Verified
                </span>
              )}
            </div>
            <Stars rating={r.rating} />
            <p className="text-body-sm mt-3 leading-relaxed" style={{ color: 'var(--color-brand-muted)' }}>
              {r.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
