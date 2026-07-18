import Link from 'next/link'
import { Plus, Edit2, Trash2, Eye, AlertCircle } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { listAdminPosts } from '@/lib/blog'
import { deletePostAction } from './actions'
import { formatDate } from '@/lib/utils'
import { getErrorMessage } from '@/lib/api'

export default async function BlogPage() {
  let posts: Awaited<ReturnType<typeof listAdminPosts>> = []
  let error = ''
  try {
    posts = await listAdminPosts()
  } catch (err) {
    error = getErrorMessage(err, 'Could not load posts.')
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Blog</h2>
          <p className="text-sm text-slate-500 mt-0.5">{posts.length} posts total</p>
        </div>
        <Link
          href="/blog/new"
          className="flex items-center gap-2 px-4 py-2 bg-[#558476] hover:bg-[#457366] text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Post
        </Link>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-900">{posts.filter((p) => p.status === 'published').length}</p>
          <p className="text-sm text-slate-500 mt-0.5">Published</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-bold text-amber-600">{posts.filter((p) => p.status === 'draft').length}</p>
          <p className="text-sm text-slate-500 mt-0.5">Drafts</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-bold text-[#558476]">
            {posts.reduce((acc, p) => acc + p.views, 0).toLocaleString('en-IN')}
          </p>
          <p className="text-sm text-slate-500 mt-0.5">Total Views</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Title</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Category</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Author</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Date</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Views</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {posts.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400 text-sm">No posts yet.</td></tr>
              ) : posts.map((post) => (
                <tr key={post.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-slate-900 max-w-xs leading-snug">{post.title}</p>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className="text-xs px-2 py-1 rounded-full bg-[#558476]/10 text-[#558476] font-medium">
                      {post.category}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500 hidden lg:table-cell">{post.author}</td>
                  <td className="px-5 py-4 text-sm text-slate-500 hidden md:table-cell">{formatDate(post.date)}</td>
                  <td className="px-5 py-4 text-sm text-slate-700 hidden lg:table-cell">
                    {post.views > 0 ? (
                      <div className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        {post.views.toLocaleString('en-IN')}
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={post.status === 'published' ? 'success' : 'default'}>
                      {post.status === 'published' ? 'Published' : 'Draft'}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/blog/${post.id}`}
                        className="p-1.5 text-slate-400 hover:text-[#558476] hover:bg-[#558476]/10 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Link>
                      <form action={deletePostAction.bind(null, post.id)}>
                        <button type="submit" className="p-1.5 text-slate-400 hover:text-[#B76E79] hover:bg-[#B76E79]/10 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
