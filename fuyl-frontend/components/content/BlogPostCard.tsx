import Link from 'next/link'

export interface BlogPostPreview {
  id:          string
  slug:        string
  title:       string
  excerpt:     string
  author:      string
  publishedAt: string
  image:       string
  imageAlt:    string
  tags:        string[]
  readTime:    number
}

interface BlogPostCardProps {
  post:     BlogPostPreview
  featured?: boolean
}

export function BlogPostCard({ post, featured }: BlogPostCardProps) {
  const { slug, title, excerpt, author, publishedAt, image, imageAlt, tags, readTime } = post

  if (featured) {
    return (
      <Link href={`/pages/learn/${slug}`} className="group grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-12 items-center">
        <div className="relative aspect-video overflow-hidden rounded-sm" style={{ background: 'var(--color-brand-cream)' }}>
          <img
            src={image}
            alt={imageAlt}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="eager"
          />
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {tags.slice(0,2).map((t) => (
              <span key={t} className="text-body-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-sm" style={{ background: 'var(--color-brand-berry-pale)', color: 'var(--color-brand-berry)' }}>
                {t}
              </span>
            ))}
            <span className="text-body-xs" style={{ color: 'var(--color-brand-muted)' }}>{readTime} min read</span>
          </div>
          <h2 className="text-display-lg font-display group-hover:text-[#8B1A4A] transition-colors">
            {title.toUpperCase()}
          </h2>
          <p className="text-body-md leading-relaxed" style={{ color: 'var(--color-brand-muted)' }}>{excerpt}</p>
          <div className="flex items-center gap-2 text-body-xs" style={{ color: 'var(--color-brand-muted)' }}>
            <span>{author}</span>
            <span>·</span>
            <span>{publishedAt}</span>
          </div>
          <span className="text-body-sm font-semibold group-hover:gap-2 transition-all" style={{ color: 'var(--color-brand-berry)' }}>
            Read Article →
          </span>
        </div>
      </Link>
    )
  }

  return (
    <Link href={`/pages/learn/${slug}`} className="group flex flex-col gap-4">
      <div className="relative aspect-video overflow-hidden rounded-sm" style={{ background: 'var(--color-brand-cream)' }}>
        <img
          src={image}
          alt={imageAlt}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        {tags.slice(0,1).map((t) => (
          <span key={t} className="text-body-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm" style={{ background: 'var(--color-brand-berry-pale)', color: 'var(--color-brand-berry)' }}>
            {t}
          </span>
        ))}
        <span className="text-body-xs" style={{ color: 'var(--color-brand-muted)' }}>{readTime} min read</span>
      </div>
      <h3 className="text-body-lg font-semibold leading-snug group-hover:text-[#8B1A4A] transition-colors line-clamp-2">
        {title}
      </h3>
      <p className="text-body-sm leading-relaxed line-clamp-3" style={{ color: 'var(--color-brand-muted)' }}>{excerpt}</p>
      <div className="flex items-center gap-2 text-body-xs mt-auto pt-2" style={{ color: 'var(--color-brand-muted)' }}>
        <span>{author}</span><span>·</span><span>{publishedAt}</span>
      </div>
    </Link>
  )
}
