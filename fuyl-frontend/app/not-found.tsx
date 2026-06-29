import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="container-brand section-py text-center flex flex-col items-center gap-6 min-h-[60vh] justify-center">
      <p
        className="text-[8rem] font-display leading-none font-bold"
        style={{ color: 'var(--color-brand-border)' }}
      >
        404
      </p>
      <h1 className="text-display-xl font-display">PAGE NOT FOUND</h1>
      <p className="text-body-lg max-w-md" style={{ color: 'var(--color-brand-muted)' }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Link
          href="/"
          className="inline-flex items-center justify-center h-11 px-8 text-xs font-semibold uppercase tracking-widest bg-[#8B1A4A] text-white rounded-sm transition-colors hover:bg-[#C4526A]"
        >
          Go Home
        </Link>
        <Link
          href="/collections/all"
          className="inline-flex items-center justify-center h-11 px-8 text-xs font-semibold uppercase tracking-widest border border-[#0A0A0A] rounded-sm transition-colors hover:bg-[#0A0A0A] hover:text-white"
        >
          Shop
        </Link>
      </div>
    </div>
  )
}
