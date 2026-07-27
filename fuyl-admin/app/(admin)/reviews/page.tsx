import { AlertCircle } from 'lucide-react'
import { ReviewsTable } from '@/components/reviews/ReviewsTable'
import { listAdminReviews } from '@/lib/reviews'
import { getErrorMessage } from '@/lib/api'

export default async function ReviewsPage() {
  let reviews: Awaited<ReturnType<typeof listAdminReviews>> = []
  let error = ''
  try {
    reviews = await listAdminReviews()
  } catch (err) {
    error = getErrorMessage(err, 'Could not load reviews.')
  }

  const pendingCount = reviews.filter((r) => r.status === 'pending').length

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Reviews</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {reviews.length} total{pendingCount > 0 && <span className="text-amber-600"> · {pendingCount} awaiting moderation</span>}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <ReviewsTable reviews={reviews} />
    </div>
  )
}
