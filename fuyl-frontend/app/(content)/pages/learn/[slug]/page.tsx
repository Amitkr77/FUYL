import Link from 'next/link'
import { generateSEO } from '@/lib/utils/seo'
import { ScrollReveal } from '@/components/ui/ScrollReveal'

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  return generateSEO({ title: slug.replace(/-/g, ' '), url: `https://fuyl.in/pages/learn/${slug}` })
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  return (
    <div className="container-brand section-py max-w-3xl mx-auto">
      <ScrollReveal>
        <Link href="/pages/learn" className="text-body-xs font-semibold uppercase tracking-wider hover:text-[#8B1A4A] transition-colors" style={{ color: 'var(--color-brand-muted)' }}>
          ← Back to Learn
        </Link>
        <h1 className="text-display-xl font-display mt-6 mb-4">{slug.replace(/-/g, ' ').toUpperCase()}</h1>
        <p className="text-body-md" style={{ color: 'var(--color-brand-muted)' }}>
          Blog post content will be loaded from the backend CMS via <code>/posts/{slug}</code>.
        </p>
      </ScrollReveal>
    </div>
  )
}
