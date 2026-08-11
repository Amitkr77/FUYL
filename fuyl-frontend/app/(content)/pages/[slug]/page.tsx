import { notFound } from 'next/navigation'
import { getPage } from '@/lib/api/content'
import { generateSEO } from '@/lib/utils/seo'
import { sanitizeHtml } from '@/lib/utils/sanitizeHtml'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  try {
    const page = await getPage(slug)
    return generateSEO({
      title: page.seoTitle ?? page.title,
      description: page.seoDescription,
      url: `https://fuyl.in/pages/${slug}`,
    })
  } catch {
    return {}
  }
}

export default async function CMSPage({ params }: Props) {
  const { slug } = await params
  let page
  try {
    page = await getPage(slug)
  } catch {
    notFound()
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-bold text-brand-forest mb-8">{page.title}</h1>
      <div
        className="prose prose-slate max-w-none"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.body) }}
      />
    </main>
  )
}
