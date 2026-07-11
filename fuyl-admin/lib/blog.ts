import { adminApiFetch, AdminApiError } from './api'

export type PostStatus = 'draft' | 'published'

interface BackendPost {
  _id: string
  title: string
  excerpt?: string
  content: string
  image?: string
  category: string
  tags?: string[]
  author: string
  status: PostStatus
  views: number
  createdAt: string
}

export interface BlogPostSummary {
  id: string
  title: string
  category: string
  author: string
  status: PostStatus
  date: string
  views: number
}

export interface BlogPostDetail extends BlogPostSummary {
  excerpt: string
  content: string
  image: string
  tags: string[]
}

export interface BlogPostInput {
  title: string
  excerpt: string
  content: string
  image: string
  category: string
  tags: string[]
  author: string
  status: PostStatus
}

function mapPost(p: BackendPost): BlogPostSummary {
  return { id: p._id, title: p.title, category: p.category, author: p.author, status: p.status, date: p.createdAt, views: p.views }
}

export async function listAdminPosts(): Promise<BlogPostSummary[]> {
  const raw = await adminApiFetch<BackendPost[]>('/admin/content/posts?limit=50')
  return raw.map(mapPost)
}

export async function getAdminPost(id: string): Promise<BlogPostDetail | null> {
  try {
    const p = await adminApiFetch<BackendPost>(`/admin/content/posts/${id}`)
    return { ...mapPost(p), excerpt: p.excerpt ?? '', content: p.content, image: p.image ?? '', tags: p.tags ?? [] }
  } catch {
    return null
  }
}

export async function createPost(input: BlogPostInput): Promise<string> {
  const p = await adminApiFetch<{ _id: string }>('/admin/content/posts', { method: 'POST', body: input })
  return p._id
}

export async function updatePost(id: string, input: BlogPostInput): Promise<void> {
  await adminApiFetch(`/admin/content/posts/${id}`, { method: 'PATCH', body: input })
}

export async function deletePost(id: string): Promise<void> {
  await adminApiFetch(`/admin/content/posts/${id}`, { method: 'DELETE' })
}

export { AdminApiError }
