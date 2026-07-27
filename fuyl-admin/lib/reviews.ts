import { adminApiFetch, AdminApiError } from './api'

// Mirrors fuyl-backend's review/models/review.model.ts.
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'flagged'

interface BackendReview {
  _id: string
  productId: string
  authorName: string
  rating: number
  title?: string
  body: string
  images?: string[]
  isVerifiedPurchase: boolean
  status: ReviewStatus
  moderationNote?: string
  reportedCount: number
  helpfulVotes: number
  createdAt: string
}

export interface AdminReview {
  id: string
  productId: string
  productName: string
  authorName: string
  rating: number
  title?: string
  body: string
  images: string[]
  isVerifiedPurchase: boolean
  status: ReviewStatus
  moderationNote?: string
  reportedCount: number
  helpfulVotes: number
  createdAt: string
}

interface BackendProductLite {
  _id: string
  name: string
}

// The review doc only carries productId — resolve names in one batch fetch
// rather than N+1'ing per review (mirrors listAdminProducts' categoryName map).
async function getProductNames(): Promise<Map<string, string>> {
  try {
    const raw = await adminApiFetch<BackendProductLite[]>('/admin/catalog/products?limit=200')
    return new Map(raw.map((p) => [p._id, p.name]))
  } catch {
    return new Map()
  }
}

function mapReview(r: BackendReview, nameById: Map<string, string>): AdminReview {
  return {
    id: r._id,
    productId: r.productId,
    productName: nameById.get(r.productId) ?? 'Unknown product',
    authorName: r.authorName,
    rating: r.rating,
    title: r.title,
    body: r.body,
    images: r.images ?? [],
    isVerifiedPurchase: r.isVerifiedPurchase,
    status: r.status,
    moderationNote: r.moderationNote,
    reportedCount: r.reportedCount,
    helpfulVotes: r.helpfulVotes,
    createdAt: r.createdAt,
  }
}

// status omitted = every status (GET /admin/reviews with no status filter).
export async function listAdminReviews(status?: ReviewStatus): Promise<AdminReview[]> {
  const qs = new URLSearchParams({ limit: '100' })
  if (status) qs.set('status', status)
  const [raw, nameById] = await Promise.all([
    adminApiFetch<BackendReview[]>(`/admin/reviews?${qs.toString()}`),
    getProductNames(),
  ])
  return raw.map((r) => mapReview(r, nameById))
}

export async function moderateReview(id: string, status: ReviewStatus, moderationNote?: string): Promise<void> {
  await adminApiFetch(`/admin/reviews/${id}/moderate`, {
    method: 'PATCH',
    body: { status, moderationNote: moderationNote || undefined },
  })
}

export { AdminApiError }
