import Link from 'next/link'

export function CartEmpty() {
  return (
    <div className="text-center py-24 flex flex-col items-center gap-6">
      <p className="text-display-xl font-display">YOUR BAG<br/>IS EMPTY</p>
      <p className="text-body-lg" style={{ color: 'var(--color-brand-muted)' }}>
        Looks like you haven't added anything yet.
      </p>
      <Link
        href="/collections/all"
        className="inline-flex items-center justify-center h-12 px-8 text-xs font-semibold uppercase tracking-widest bg-[#8B1A4A] text-white rounded-sm transition-colors hover:bg-[#C4526A]"
      >
        Shop Now
      </Link>
    </div>
  )
}
