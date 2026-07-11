import Link from 'next/link'
import { getAdminPost } from '@/lib/blog'
import { EditBlogPostForm } from '@/components/blog/EditBlogPostForm'

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await getAdminPost(id)

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-2xl font-bold text-slate-900 mb-2">Post not found</p>
        <Link href="/blog" className="text-sm text-[#558476] hover:underline">← Back to Blog</Link>
      </div>
    )
  }

  return <EditBlogPostForm post={post} />
}
